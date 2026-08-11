Feature: Task Company Link

Scenario: User creates a task associated with a company
Given a user is authenticated
When the user creates a task associated with a company
Then the task is created linked to that company

Scenario: User creates a task without a company
Given a user is authenticated
When the user creates a task without a company
Then the task has no company

Scenario: User creates a task about a company and one of its contacts
Given a user is authenticated
When the user creates a task for a company and a contact
Then the task is created linked to that company and contact

Scenario: User links an existing task to a company and contact by editing it
Given a user is authenticated
And the user owns a task with no company
When the user edits the task to set a company and a contact
Then the task ends up linked to that company and contact
