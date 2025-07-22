from src.auth import auth_bp
# from src.auth.controller import AuthController, AuthError
from src.auth.controller import authenticate_user, register_user
from flask import render_template, redirect, url_for, request, flash, jsonify  , make_response
from flask_login import login_required, current_user, logout_user
from flask_jwt_extended import create_access_token , set_access_cookies , unset_jwt_cookies

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username')
        password = data.get('password')
        remember = data.get('remember', True)

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        success, response = authenticate_user(username, password, remember)
        if success:
            access_token = create_access_token(identity=username)
            
            if request.is_json:
                response_data = response
                response_data['access_token'] = access_token
                resp = make_response(jsonify(response_data))
                set_access_cookies(resp, access_token)
                return resp
            else:
                flash('با موفقیت وارد حساب کاربری شدید', 'success')
                resp = make_response(redirect(url_for('index')))
                set_access_cookies(resp, access_token)
                return resp
        else:
            if request.is_json:
                return jsonify(response), 401
            flash(response.get('error', 'Login failed'), 'error')


    return render_template('login.html')
@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', 'user')

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        success, response = register_user(username, password, role)
        if success:
            if request.is_json:
                return jsonify(response)
            flash('Registration successful!', 'success')
            return redirect(url_for('auth.login'))
        else:
            if request.is_json:
                return jsonify(response), 400
            flash(response.get('error', 'Registration failed'), 'error')

    return render_template('register.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('با موفقیت از حساب کاربری خارج شدید!', 'success')
    resp = redirect(url_for('auth.login'))
    resp = make_response(resp)
    unset_jwt_cookies(resp)
    return resp