Feature: Task Creation

Scenario: User creates a task for themselves
Given a user is authenticated
When the user creates a task assigned to themselves
Then the task is created
And the task is assigned to the user

Scenario: User creates a task without specifying an assignee
Given a user is authenticated
When the user creates a task without specifying an assignee
Then the task is created
And the task is assigned to the user

Scenario: Administrator creates a task assigned to another user
Given an administrator is authenticated
When the administrator creates a task assigned to another user
Then the task is created
And the task is assigned to that other user

Scenario: Creator creates an unassigned task
Given a creator is authenticated
When the creator creates an unassigned task
Then the task is created
And the task has no assignee

Scenario: User cannot create a task assigned to another user
Given a user is authenticated
When the user attempts to create a task assigned to another user
Then the task is not created

Scenario: User cannot create an unassigned task
Given a user is authenticated
When the user attempts to create an unassigned task
Then the task is not created
