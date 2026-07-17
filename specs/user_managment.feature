Feature: User Management

Scenario: Create a normal user
Given an administrator is authenticated
When creates a user with role USER
Then the user should be stored
And the user role should be USER

Scenario: Create an administrator user
Given an administrator is authenticated
When creates a user with role ADMIN
Then the user should be stored
And the user role should be ADMIN

Scenario: Create a creator user
Given an administrator is authenticated
When creates a user with role CREATOR
Then the user should be stored
And the user role should be CREATOR

Scenario: Change own password
Given a user is authenticated
When changes the password
Then the new password should be stored
And the old password should no longer be valid

Scenario: Promote a user to administrator
Given a creator is authenticated
And a user exists with role USER
When changes the user's role to ADMIN
Then the user role should be ADMIN

Scenario: Creating a user with a taken name is rejected
Given an administrator is authenticated
And a user named "Jane Doe" already exists
When creating another user named "Jane Doe"
Then the creation is rejected as a conflict
