-- Consolidate the demo project onto wt_demo.
-- Background: 0002 seeded we_demo, but the Sprint 3 E2E data, the dashboard,
-- and the docs all use wt_demo. This migration converges both fresh DBs and
-- prod onto a single wt_demo owned by the demo user, then removes we_demo.

-- ensure wt_demo exists and is owned by the demo user
INSERT OR IGNORE INTO projects (project_id, name, owner_id)
VALUES ('wt_demo', 'WatchTower Demo', 'usr_demo');
UPDATE projects SET owner_id = 'usr_demo'
  WHERE project_id = 'wt_demo' AND owner_id IS NULL;

-- move any events still under we_demo to wt_demo
UPDATE events SET project_id = 'wt_demo' WHERE project_id = 'we_demo';

-- drop the now-empty we_demo project row
DELETE FROM projects WHERE project_id = 'we_demo';

-- standardize the name
UPDATE projects SET name = 'WatchTower Demo' WHERE project_id = 'wt_demo';
