Feature: User Directory

Privileged users (ADMIN or CREATOR) can browse the user directory. A plain user
may only look themselves up; listing everyone is reserved for the privileged.
The password hash is never part of a user view.

Scenario: An administrator lists all users
Given an administrator is authenticated
And two users exist
When the administrator lists the users
Then every existing user is returned
And no user view exposes a password hash

Scenario: A plain user is forbidden from listing the users
Given a plain user is authenticated
And two users exist
When the user lists the users
Then listing is denied

Scenario: An administrator views any user
Given an administrator is authenticated
And another user exists
When the administrator views that user
Then the requested user is returned
And the user view exposes no password hash

Scenario: A user views their own profile
Given a plain user is authenticated
When the user views their own profile
Then the requested user is returned

Scenario: A user is forbidden from viewing another user
Given a plain user is authenticated
And another user exists
When the user views that other user
Then viewing is denied

Scenario: Viewing a user that does not exist is reported as not found
Given an administrator is authenticated
When the administrator views a user that does not exist
Then the user is reported as not found
