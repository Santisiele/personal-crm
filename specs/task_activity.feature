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

Scenario: An owner views the activity log of their task
Given a user is authenticated
And the task belongs to that user
And the task has two logged activities
When the user views the activity log
Then the full activity log is returned most-recent first

Scenario: A user cannot view the activity log of another user's task
Given a user is authenticated
And a task belongs to another user
When the user attempts to view the activity log
Then viewing the activity log is denied

Scenario: Viewing the activity log of a task that does not exist
Given a user is authenticated
When the user views the activity log of a missing task
Then the task is reported as not found
