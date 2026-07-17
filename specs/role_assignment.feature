Feature: Role Assignment

Granting a role is the creator's prerogative. An administrator may only manage
plain users and may never grant anything above USER, so it can neither mint a
peer nor tamper with a superior. A plain user may not touch roles at all — least
of all their own.

Scenario: The creator promotes a user to administrator
Given a creator is authenticated
And a plain user exists
When the creator assigns the ADMIN role to that user
Then the role is assigned

Scenario: The creator demotes an administrator to plain user
Given a creator is authenticated
And an administrator exists
When the creator assigns the USER role to that administrator
Then the role is assigned

Scenario: A plain user cannot promote themselves
Given a plain user is authenticated
When the user assigns the CREATOR role to themselves
Then the role assignment is denied

Scenario: An administrator cannot mint another administrator
Given an administrator is authenticated
And a plain user exists
When the administrator assigns the ADMIN role to that user
Then the role assignment is denied

Scenario: An administrator cannot demote the creator
Given an administrator is authenticated
And a creator exists
When the administrator assigns the USER role to that creator
Then the role assignment is denied

Scenario: Assigning a role to a user that does not exist is reported as not found
Given a creator is authenticated
When the creator assigns the ADMIN role to a user that does not exist
Then the user is reported as not found
