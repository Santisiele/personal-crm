Feature: Task Activity

Scenario: An owner logs an activity on their task
Given a user is authenticated
And the task belongs to that user
When the user logs an activity on the task
Then the activity is stored

Scenario: A user cannot log an activity on another user's task
Given a user is authenticated
And a task belongs to another user
When the user attempts to log an activity on the task
Then logging is denied
