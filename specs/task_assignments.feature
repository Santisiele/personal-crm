Feature: Task Assignment History

Scenario: An owner views the assignment history of their task
Given a user is authenticated
And the task belongs to that user
And the task has been assigned twice
When the user views the assignment history
Then the full history is returned most-recent first

Scenario: A user cannot view the history of another user's task
Given a user is authenticated
And a task belongs to another user
When the user attempts to view the assignment history
Then viewing the history is denied

Scenario: Viewing the history of a task that does not exist
Given a user is authenticated
When the user views the history of a missing task
Then the task is reported as not found

Scenario: The assignee accepts their current assignment
Given a user is authenticated
And the user has a pending assignment on a task
When the assignee accepts the assignment
Then the assignment status is accepted

Scenario: The assignee rejects their current assignment
Given a user is authenticated
And the user has a pending assignment on a task
When the assignee rejects the assignment
Then the assignment status is rejected

Scenario: A user cannot accept an assignment that is not theirs
Given a user is authenticated
And another user has a pending assignment on a task
When the user attempts to accept that assignment
Then acting on the assignment is denied

Scenario: Accepting an assignment that does not exist
Given a user is authenticated
When the user attempts to accept a missing assignment
Then the assignment is reported as not found
