Feature: Task Company Link

Scenario: User creates a task associated with a company
Given a user is authenticated
When the user creates a task associated with a company
Then the task is created linked to that company

Scenario: User creates a task without a company
Given a user is authenticated
When the user creates a task without a company
Then the task has no company
