Feature: Task Archiving

Scenario: Owner archives their task
Given a user is authenticated
And the task belongs to that user
When the user archives the task with a reason
Then the task is archived
And the task can no longer be viewed

Scenario: An administrator archives another user's task
Given an administrator is authenticated
And a task belongs to another user
When the administrator archives the task with a reason
Then the task is archived

Scenario: A user cannot archive another user's task
Given a user is authenticated
And a task belongs to another user
When the user attempts to archive the task
Then archiving is denied
