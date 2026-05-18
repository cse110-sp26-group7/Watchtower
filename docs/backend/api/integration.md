# Integration
## How to Embed
1. Install Watchtower
2. Add this to your applications code
```
function init() {
  const wt = new WatchTower({ projectId: "wt_a1b2c3d4" })
  wt.init()
}
```
***
## How to Test
1. After settingup, you should see the following console logs in your web application
  - Watchtower initialized: Watchtower
  - SDK loaded: Watchtower

  ![Alt text](../../res/sdk-test-example.png)
***
