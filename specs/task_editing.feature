Feature: Task Editing

The content of a task — its title, description and due date — can be edited
after creation. This is what lets a calendar reschedule a task by moving it to
another day. The owner, the current assignee, or a privileged actor may edit;
anyone else is refused. Editing is partial: only the fields provided change, and
a due date can be cleared by sending null.

Scenario: The owner reschedules a task
Given a user is authenticated
And that user owns a task due on 2026-01-10
When the owner edits the task due date to 2026-01-17
Then the task is due on 2026-01-17

Scenario: The owner edits the title and description
Given a user is authenticated
And that user owns a task due on 2026-01-10
When the owner edits the task title to "Renamed"
Then the task title is "Renamed"
And the task is still due on 2026-01-10

Scenario: The owner clears the due date
Given a user is authenticated
And that user owns a task due on 2026-01-10
When the owner clears the task due date
Then the task has no due date

Scenario: A stranger cannot edit the task
Given a user is authenticated
And a task belongs to another user
When the user edits that task title to "Hijacked"
Then editing is denied

Scenario: Editing a task that does not exist is reported as not found
Given a user is authenticated
When the user edits a task that does not exist
Then the task is reported as not found
