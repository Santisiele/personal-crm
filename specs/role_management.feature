Feature: Role Management

Only a CREATOR may administer role definitions: creating new role keys and
listing the existing ones. A role description is unique; creating one that
already exists is a conflict. Every other actor is denied.

Scenario: A creator creates a role
Given a creator is authenticated
When the creator creates a role "MANAGER"
Then the role "MANAGER" is stored

Scenario: A non-creator cannot create a role
Given an administrator is authenticated
When the administrator attempts to create a role "MANAGER"
Then the role creation is denied

Scenario: Creating a duplicate role is rejected
Given a creator is authenticated
And a role "MANAGER" already exists
When the creator attempts to create a role "MANAGER"
Then the role already exists

Scenario: A creator lists the roles
Given a creator is authenticated
And the roles "MANAGER" and "ANALYST" exist
When the creator lists the roles
Then both roles are returned
