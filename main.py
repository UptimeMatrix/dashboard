from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_wtf.csrf import CSRFProtect
from functools import wraps
import json
import yaml
from datetime import datetime
from flask_cors import CORS
import os

app = Flask(__name__)
app.secret_key = 'your-secret-key-here' 
csrf = CSRFProtect(app)

CORS(app, resources={r"/data": {"origins": "*"}})

JSON_FILE = 'public/data/status.json'
USERS_FILE = 'users.yml'

os.makedirs(os.path.dirname(JSON_FILE), exist_ok=True)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def load_json():
    try:
        with open(JSON_FILE, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        return {"OverallStatus": "NoOverride", "services": [], "sections": {}}

def save_json(data):
    with open(JSON_FILE, 'w') as file:
        json.dump(data, file, indent=2)

def load_users():
    with open(USERS_FILE, 'r') as file:
        return yaml.safe_load(file)

@app.route('/')
@login_required
def dashboard():
    data = load_json()
    return render_template('dashboard.html', data=data)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        users = load_users()
        username = request.form['username']
        password = request.form['password']
        
        if username in users and users[username] == password:
            session['logged_in'] = True
            return redirect(url_for('dashboard'))
        return render_template('login.html', error='Invalid credentials')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

@app.route('/data')
def get_data():
    return jsonify(load_json())

@app.route('/api/service', methods=['GET', 'POST'])
@login_required
@csrf.exempt
def manage_data():
    data = load_json()
    
    if request.method == 'GET':
        return jsonify(data)
        
    try:
        content = request.get_json()
        
        if isinstance(content, dict) and 'action' not in content:
            save_json(content)
            return jsonify({'success': True, 'data': content})
            
        action = content.get('action')
        
        if action == 'add_category':
            new_category = {
                'categoryName': content['name'],
                'services': []
            }
            data['services'].append(new_category)

        elif action == 'update_category':
            for category in data['services']:
                if category['categoryName'] == content['oldName']:
                    category['categoryName'] = content['newName']

        elif action == 'delete_category':
            data['services'] = [cat for cat in data['services'] 
                              if cat['categoryName'] != content['name']]

        elif action == 'add_service':
            new_service = {
                'serviceName': content['name'],
                'status': 'Operational'
            }
            for category in data['services']:
                if category['categoryName'] == content['category']:
                    category['services'].append(new_service)
                    break

        elif action == 'update_service':
            for category in data['services']:
                for service in category['services']:
                    if service['serviceName'] == content['oldName']:
                        service['serviceName'] = content.get('newName', service['serviceName'])
                        service['status'] = content.get('status', service['status'])

        elif action == 'delete_service':
            for category in data['services']:
                category['services'] = [srv for srv in category['services']
                                      if srv['serviceName'] != content['name']]

        elif action == 'update_settings':
            if 'data' in content:
                save_json(content['data'])
                return jsonify({'success': True, 'data': content['data']})
                
            if 'sections' in content:
                if 'sections' not in data:
                    data['sections'] = {}
                data['sections'].update(content['sections'])

            if 'announcement' in content:
                if 'announcement' not in data:
                    data['announcement'] = {}
                data['announcement']['text'] = content['announcement']

            if 'maintenance' in content:
                data['maintenanceAlerts'] = content['maintenance']

            if 'statusUpdates' in content:
                data['statusUpdates'] = content['statusUpdates']

        elif action == 'update_status':
            service_name = content['serviceName']
            new_status = content['status']
            status_updated = False
            
            for category in data['services']:
                for service in category['services']:
                    if service['serviceName'] == service_name:
                        service['status'] = new_status
                        status_updated = True
                        break
                if status_updated:
                    break
                    
            if not status_updated:
                return jsonify({'success': False, 'error': 'Service not found'}), 404

        else:
            data = content
            
        save_json(data)
        return jsonify({'success': True, 'data': data})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)