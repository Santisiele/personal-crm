Feature: User Deactivation

Privileged users (ADMIN or CREATOR) can deactivate a user, a logical delete that
hides the user from the directory listing and from login lookups while keeping
the record retrievable by id, so historical references stay viewable. The record
is never physically removed. A plain user may not deactivate anyone.

Scenario: An administrator deactivates a user
Given an administrator is authenticated
And another user exists
When the administrator deactivates that user
Then the user no longer appears in the directory listing

Scenario: A deactivated user can still be viewed by id
Given an administrator is authenticated
And another user exists
When the administrator deactivates that user
Then the user can still be viewed by id

Scenario: A plain user is forbidden from deactivating a user
Given a plain user is authenticated
And another user exists
When the user attempts to deactivate that user
Then deactivation is denied

Scenario: Deactivating a user that does not exist is reported as not found
Given an administrator is authenticated
When the administrator deactivates a user that does not exist
Then the user is reported as not found

Scenario: The name of a deactivated user can be reused
Given an administrator is authenticated
And another user exists
When that user is deactivated and a new account takes the same name
Then the new account is created with that name
