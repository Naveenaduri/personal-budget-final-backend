const express = require('express');
const mysql = require('mysql');
const crypto = require('crypto');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');

const port = process.env.PORT || 3001;
const app = express();
app.use(cors());

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'final_project_nbad'
});

const secretKey = 'Hell'

const jwtMiddleware = expressJwt({
    secret: secretKey,
    algorithms: ['HS256']
});

app.use(express.json());

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL');
});

const closeMysqlConnection = () => {
    connection.end((err) => {
        if (err) {
            console.error('Error closing MySQL connection:', err);
        } else {
            console.log('MySQL connection closed');
        }
    });
};

function transformDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function generateSalt() {
    return crypto.randomBytes(32).toString('hex');
}

function encryptPassword(password, salt) {
    const hash = crypto.createHash('sha256');
    hash.update(password + salt);
    return hash.digest('hex');
}

//API for signup
app.post('/api/signup', async (req, res) => {
    const { first_name, last_name, password, email, phone_number } = req.body;
    const salt = generateSalt();
    const hashedPassword = encryptPassword(password, salt);
    const date = transformDate(new Date());

    connection.query(
        'INSERT INTO user (first_name, last_name, password, salt, created_date, email, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [first_name, last_name, hashedPassword, salt, date, email, phone_number],
        (error, results) => {
            if (error) {
                console.error(error);
                res.status(500).json({success: false, error: error.sqlMessage });
            } else {
                res.json({status: 200, success: true, response: results });
            }
        }
    );
});

app.post('/api/login', async (req, res) => {
    const { password, email } = req.body;

    connection.query('SELECT * FROM user WHERE email = ?', [email], (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to retrieve user' });
        } else {
            if (results.length > 0) {
                const user = results[0];
                const hashedPassword = encryptPassword(password, user.salt);

                if (hashedPassword === user.password) {
                    const token = jwt.sign(
                        { email: user.email, userId: user.id },
                        secretKey,
                        { expiresIn: '1m' }
                    );

                    res.json({
                        success: true,
                        message: 'Login successful',
                        user: { email: user.email, first_name: user.first_name, last_name: user.last_name, user_id : user.id },
                        token: token
                    });
                } else {
                    res.status(401).json({ success: false, message: 'Incorrect password' });
                }
            } else {
                res.status(404).json({ success: false, message: 'User not found' });
            }
        }
    });
});

app.post('/api/logout', (req, res) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token not provided' });
    }

    try {
        jwt.verify(token, secretKey);
        res.setHeader('Clear-Token', 'true');
        res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

app.post('/api/refreshToken', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    try {
        const decoded = jwt.verify(refreshToken, secretKey);
        const newAccessToken = jwt.sign(
            { email: decoded.email, userId: decoded.userId },
            secretKey,
            { expiresIn: '5m' }
        );
        res.json({ success: true, message: 'Token refreshed successfully', accessToken: newAccessToken });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
});

// Endpoint for getting all budgets for a user
app.get('/api/budgets', jwtMiddleware, (req, res) => {
    const userId = req.auth.userId;

    connection.query(
        'SELECT * FROM user_budgets WHERE user_id = ?',
        [userId],
        (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to get budgets' });
        } else {
            res.json(results);
        }
        }
    );
});

app.post('/api/add-budget', jwtMiddleware, (req, res) => {
    // Only authenticated users can access this endpoint due to jwtMiddleware
    const userId = req.auth.userId; // Extract userId from the decoded token
    var { category, budget_amount } = req.body;

    category = category.toLowerCase();
    // Validate the budget data
    if (!category || typeof budget_amount !== 'number' || budget_amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid budget data' });
    }

    // Save the budget to the MySQL database
    const sql = 'INSERT INTO user_budgets (user_id, category, budget_amount) VALUES (?, ?, ?)';
    const values = [userId, category, budget_amount];

    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.sqlMessage });
        }

        const newBudget = {
            id: results.insertId,
            userId,
            category,
            budget_amount
        };

        res.json({ success: true, message: 'Budget added successfully', budget: newBudget });
    });
});

app.delete('/api/delete-budget/:budgetId', jwtMiddleware, (req, res) => {
    // Only authenticated users can access this endpoint due to jwtMiddleware
    const userId = req.auth.userId; // Extract userId from the decoded token
    const budgetId = req.params.budgetId;

    // Validate the budgetId parameter
    if (!budgetId || isNaN(budgetId)) {
        return res.status(400).json({ success: false, message: 'Invalid budgetId parameter' });
    }

    // Delete the budget from the MySQL database
    const sql = 'DELETE FROM user_budgets WHERE id = ? AND user_id = ?';
    const values = [budgetId, userId];

    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Failed to delete budget' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Budget not found or unauthorized' });
        }

        res.json({ success: true, message: 'Budget deleted successfully' });
    });
});

app.post('/api/addExpense', jwtMiddleware, (req, res) => {
    // Only authenticated users can access this endpoint due to jwtMiddleware
    const userId = req.auth.userId; // Extract userId from the decoded token
    const { date, categoryName, categoryId, amount } = req.body;

    // Validate the expense data
    if (!date || !categoryName || !categoryId || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid expense data' });
    }

    // Save the expense to the MySQL database
    const sql = 'INSERT INTO expenses (userId, date, categoryid, categoryName, amount) VALUES (?, ?, ?, ?, ?)';
    const values = [userId, date, categoryId, categoryName, amount]; // Fixed category to categoryId

    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.sqlMessage });
        }

        const newExpense = {
            id: results.insertId,
            userId,
            date,
            categoryId, // Updated to categoryId
            categoryName, // Added categoryName
            amount
        };

        res.json({ success: true, message: 'Expense added successfully', expense: newExpense });
    });
});

app.get('/api/getExpenses', jwtMiddleware, async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { date } = req.query; // Use req.query instead of req.body for GET requests

        // Validate the date parameter
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date parameter is required' });
        }

        // Assuming your expenses table is named 'expenses'
        const sql = 'SELECT id, date, categoryName, amount FROM expenses WHERE userId = ? AND date = ?';
        const values = [userId, date];

        connection.query(sql, values, (error, results) => {
            if (error) {
                console.error(error);
                res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
            } else {
                res.json({ success: true, expenses: results });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.delete('/api/deleteExpense/:expenseId', jwtMiddleware, (req, res) => {
    // Only authenticated users can access this endpoint due to jwtMiddleware
    const userId = req.auth.userId; // Extract userId from the decoded token
    const expenseId = req.params.expenseId;

    // Validate the expenseId parameter
    if (!expenseId || isNaN(expenseId)) {
        return res.status(400).json({ success: false, message: 'Invalid expenseId parameter' });
    }

    // Delete the expense from the MySQL database
    const sql = 'DELETE FROM expenses WHERE id = ? AND userId = ?';
    const values = [expenseId, userId];

    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: 'Failed to delete expense' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Expense not found or unauthorized' });
        }

        res.json({ success: true, message: 'Expense deleted successfully' });
    });
});

app.get('/', async (req, res) => {
        res.status(200).json({success : true, message : 'Everything is Good.'});
});

const server = app.listen(port, () => {
    console.log(`Server on port ${port}`);
});

// Close the server and MySQL connection when the tests are finished
process.on('exit', () => {
    server.close();
    closeMysqlConnection();
    console.log('Server and MySQL connection closed');
});

module.exports = app;