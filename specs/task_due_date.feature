Feature: Task Due Date

Scenario: User creates a task with a due date
Given a user is authenticated
When the user creates a task with a due date
Then the task is created with that due date

Scenario: User creates a task without a due date
Given a user is authenticated
When the user creates a task without a due date
Then the task has no due date
