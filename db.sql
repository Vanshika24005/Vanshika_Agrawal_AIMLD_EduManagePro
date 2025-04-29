-- Create the database
CREATE DATABASE school_management_system;

-- Use the database
USE school_management_system;

-- Create users table with is_verified and confirmation_token fields
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    confirmation_token VARCHAR(255) NULL,
    reset_token VARCHAR(255) NULL,
    reset_token_expires DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Create tables for teachers, students, parents, classes, subjects, attendance, and school_info

CREATE TABLE teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    status VARCHAR(20) DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    teacher_id INT,
    room VARCHAR(20),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE parents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    class_id INT,
    parent_id INT,
    phone VARCHAR(20),
    address TEXT,
    status VARCHAR(20) DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL
);

CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    class_id INT,
    teacher_id INT,
    book VARCHAR(255),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    note TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE school_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL
);

CREATE TABLE activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    activity TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create an index on email for faster lookups
CREATE INDEX idx_user_email ON users(email);

-- Stored procedure for user registration (admin only)
DELIMITER //
CREATE PROCEDURE RegisterUser(
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_confirmation_token VARCHAR(255)
)
BEGIN
    -- Check if email already exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        INSERT INTO users (email, password, role, is_verified, confirmation_token) 
        VALUES (p_email, p_password, 'admin', FALSE, p_confirmation_token);
        SELECT 'Registration Successful' AS result;
    ELSE
        SELECT 'Email already exists' AS result;
    END IF;
END //
DELIMITER ;

-- Stored procedure for user login
DELIMITER //
CREATE PROCEDURE UserLogin(
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255)
)
BEGIN
    DECLARE user_count INT;
    DECLARE is_user_verified BOOLEAN;
    
    -- First check if user exists
    SELECT COUNT(*), is_verified INTO user_count, is_user_verified 
    FROM users 
    WHERE email = p_email;
    
    IF user_count = 0 THEN
        SELECT 'Invalid Credentials' AS result;
    ELSEIF is_user_verified = FALSE THEN
        SELECT 'Account not verified' AS result;
    ELSE
        -- Now check password 
        -- (Note: In the actual application, the password comparison would be handled by bcrypt)
        SELECT 'Login Successful' AS result, role, id 
        FROM users 
        WHERE email = p_email;
        
        -- Update last login time
        UPDATE users SET last_login = CURRENT_TIMESTAMP 
        WHERE email = p_email;
    END IF;
END //
DELIMITER ;

-- Stored procedure to verify email
DELIMITER //
CREATE PROCEDURE VerifyEmail(
    IN p_token VARCHAR(255)
)
BEGIN
    DECLARE user_count INT;
    
    -- Check if token exists
    SELECT COUNT(*) INTO user_count 
    FROM users 
    WHERE confirmation_token = p_token;
    
    IF user_count > 0 THEN
        -- Update user as verified and clear token
        UPDATE users 
        SET is_verified = TRUE, confirmation_token = NULL 
        WHERE confirmation_token = p_token;
        
        SELECT 'Email verified successfully' AS result;
    ELSE
        SELECT 'Invalid or expired token' AS result;
    END IF;
END //
DELIMITER ;