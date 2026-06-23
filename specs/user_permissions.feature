Feature: User Permissions

Scenario: Administrator can view any task
Given an administrator is authenticated
And a task belongs to another user
When requests the task
Then access is granted

Scenario: Creator can view any task
Given a creator is authenticated
And a task belongs to another user
When requests the task
Then access is granted

Scenario: User can view own task
Given a user is authenticated
And the task belongs to that user
When requests the task
Then access is granted

Scenario: User cannot view another user's task
Given a user is authenticated
And the task belongs to another user
When requests the task
Then access is denied

Scenario: User can reassign own task
Given a user is authenticated
And the task belongs to that user
When reassigns the task
Then the reassignment is successful

Scenario: User cannot reassign another user's task
Given a user is authenticated
And the task belongs to another user
When attempts to reassign the task
Then access is denied
