const request = require('supertest');
const app = require('./server');

// Test case for successful signup
test('POST /api/signup should sign up a new user', async () => {
  const userData = {
    first_name: 'John',
    last_name: 'Doe',
    password: 'password123',
    email: 'john.doe'+Math.floor(Math.random()*90000) + 10000 +'@example.com',
    phone_number: '1234567890'
  };

  // Send a POST request to the '/api/signup' endpoint with the user data
  const response = await request(app)
    .post('/api/signup')
    .send(userData)
    .expect(200); // Expect a 200 OK response
  // Verify the response contains the expected data
  expect(response.body).toEqual({
    status : 200,
    success: true,
    response: expect.any(Object) // You can specify the expected structure of the response here
  });
});

// Test case for failed signup
test('POST /api/signup should handle a failed signup', async () => {
  const invalidUserData = {
    // Missing required fields or invalid data to simulate a failed signup
  };

  // Send a POST request to the '/api/signup' endpoint with invalid user data
  const response = await request(app)
    .post('/api/signup')
    .send(invalidUserData)
    .expect(500); // Expect a 500 Internal Server Error (or customize based on your error handling)

  // Verify the response contains the expected data for a failed signup
  expect(response.body).toEqual({
    success: false,
    error: expect.any(String) // You can specify the expected structure of the error response here
  });
});
