# Project README

This Node.js backend, built with Express and MySQL, provides user authentication, budget management, and expense tracking. Notable dependencies include `express`, `mysql`, `crypto`, `cors`, and `jsonwebtoken`.

## Key APIs

1. **Signup**
   - `POST /api/signup`: Creates a new user with parameters `first_name`, `last_name`, `password`, `email`, and `phone_number`.

2. **Login**
   - `POST /api/login`: Validates user credentials and generates a JWT for authentication.

3. **Logout**
   - `POST /api/logout`: Logs out the user by invalidating the JWT.

4. **Token Refresh**
   - `POST /api/refreshToken`: Refreshes the JWT using a provided refresh token.

5. **Get User Budgets**
   - `GET /api/budgets`: Retrieves budgets for the authenticated user.

6. **Add Budget**
   - `POST /api/add-budget`: Adds a budget for the authenticated user.

7. **Delete Budget**
   - `DELETE /api/delete-budget/:budgetId`: Deletes a budget for the authenticated user.

8. **Add Expense**
   - `POST /api/addExpense`: Adds an expense for the authenticated user.

9. **Get Expenses**
   - `GET /api/getExpenses`: Retrieves expenses for the authenticated user based on a specified date.

10. **Delete Expense**
    - `DELETE /api/deleteExpense/:expenseId`: Deletes an expense for the authenticated user.

## MySQL Deployment
The backend assumes MySQL is installed on the same system. Modify MySQL connection details in `app.js` accordingly.

## Unit Test Cases
1. **Successful Signup**
   - Verifies the successful creation of a new user.

2. **Duplicate Signup**
   - Checks for proper handling of duplicate signup attempts.

