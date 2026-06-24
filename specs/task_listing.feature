Feature: Task Listing

Scenario: A user lists only the tasks they can see
Given a user is authenticated
And the user owns a task
And another task is assigned to the user
And a task belongs to another user
When the user lists their tasks
Then the listing contains the owned and assigned tasks
And the listing excludes the other user's task

Scenario: A privileged user lists every task
Given an administrator is authenticated
And several tasks exist across different users
When the administrator lists tasks
Then the listing contains every task

Scenario: A user filters their tasks by company
Given a user is authenticated
And the user owns a task linked to a company
And the user owns a task with no company
When the user lists tasks for that company
Then the listing contains only the company's task

Scenario: Archived tasks are excluded from the listing
Given a user is authenticated
And the user owns a task
And the user owns an archived task
When the user lists their tasks
Then the listing excludes the archived task
