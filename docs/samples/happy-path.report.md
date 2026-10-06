# Upgrade Drill: happy-path

All validators upgrade together and adopt the new protocol version.

**Overall verdict: ✅ NETWORK_UPGRADED**

All 3 validators ended synced and on protocol 29.

## Per-node outcome

| Node | Final state | Protocol version | Explanation |
| --- | --- | --- | --- |
| node1 | Synced! | 29 | node1 ended synced on protocol 29 (quorum agreement 3/3). |
| node2 | Synced! | 29 | node2 ended synced on protocol 29 (quorum agreement 3/3). |
| node3 | Synced! | 29 | node3 ended synced on protocol 29 (quorum agreement 3/3). |

## Timeline

| Time | Node | Ledger | Protocol | State |
| --- | --- | --- | --- | --- |
| +0s | node1 | 1 | 0 | Synced! |
| +0s | node2 | 1 | 0 | Synced! |
| +0s | node3 | 1 | 0 | Synced! |
| +10s | node1 | 3 | 0 | Synced! |
| +10s | node2 | 3 | 0 | Synced! |
| +10s | node3 | 3 | 0 | Synced! |
| +20s | node1 | 5 | 0 | Synced! |
| +20s | node2 | 5 | 0 | Synced! |
| +20s | node3 | 5 | 0 | Synced! |
| +30s | node1 | 7 | 0 | Synced! |
| +30s | node2 | 7 | 0 | Synced! |
| +30s | node3 | 7 | 0 | Synced! |
| +40s | node1 | 9 | 0 | Synced! |
| +40s | node2 | 9 | 0 | Synced! |
| +40s | node3 | 9 | 0 | Synced! |
| +50s | node1 | 11 | 0 | Synced! |
| +50s | node2 | 11 | 0 | Synced! |
| +50s | node3 | 11 | 0 | Synced! |
| +60s | node1 | 13 | 0 | Synced! |
| +60s | node2 | 13 | 0 | Synced! |
| +60s | node3 | 13 | 0 | Synced! |
| +70s | node1 | 15 | 0 | Synced! |
| +70s | node2 | 15 | 0 | Synced! |
| +70s | node3 | 15 | 0 | Synced! |
| +80s | node1 | 17 | 0 | Synced! |
| +80s | node2 | 17 | 0 | Synced! |
| +80s | node3 | 17 | 0 | Synced! |
| +90s | node1 | 19 | 0 | Synced! |
| +90s | node2 | 19 | 0 | Synced! |
| +90s | node3 | 19 | 0 | Synced! |
| +90s | node1 | — | — | — |
| +90s | node2 | 19 | 0 | Synced! |
| +90s | node3 | 19 | 0 | Synced! |
| +91s | node1 | 19 | 0 | Synced! |
| +91s | node2 | — | — | — |
| +91s | node3 | 19 | 0 | Synced! |
| +91s | node1 | 19 | 0 | Synced! |
| +91s | node2 | 19 | 0 | Synced! |
| +91s | node3 | — | — | — |
| +101s | node1 | 21 | 0 | Synced! |
| +101s | node2 | 21 | 0 | Synced! |
| +101s | node3 | 21 | 0 | Synced! |
| +111s | node1 | 23 | 0 | Synced! |
| +111s | node2 | 23 | 0 | Synced! |
| +111s | node3 | 23 | 0 | Synced! |
| +121s | node1 | 25 | 0 | Synced! |
| +121s | node2 | 25 | 0 | Synced! |
| +121s | node3 | 25 | 0 | Synced! |
| +131s | node1 | 27 | 0 | Synced! |
| +131s | node2 | 27 | 0 | Synced! |
| +131s | node3 | 27 | 0 | Synced! |
| +141s | node1 | 29 | 0 | Synced! |
| +141s | node2 | 29 | 0 | Synced! |
| +141s | node3 | 29 | 0 | Synced! |
| +151s | node1 | 31 | 0 | Synced! |
| +151s | node2 | 31 | 0 | Synced! |
| +151s | node3 | 31 | 0 | Synced! |
| +161s | node1 | 33 | 0 | Synced! |
| +161s | node2 | 33 | 0 | Synced! |
| +161s | node3 | 33 | 0 | Synced! |
| +171s | node1 | 35 | 0 | Synced! |
| +171s | node2 | 35 | 0 | Synced! |
| +171s | node3 | 35 | 0 | Synced! |
| +181s | node1 | 37 | 0 | Synced! |
| +181s | node2 | 37 | 0 | Synced! |
| +181s | node3 | 37 | 0 | Synced! |
| +181s | node1 | 37 | 0 | Synced! |
| +181s | node2 | 37 | 0 | Synced! |
| +181s | node3 | 37 | 0 | Synced! |
| +191s | node1 | 39 | 0 | Synced! |
| +191s | node2 | 39 | 0 | Synced! |
| +191s | node3 | 39 | 0 | Synced! |
| +201s | node1 | 41 | 0 | Synced! |
| +201s | node2 | 41 | 0 | Synced! |
| +201s | node3 | 41 | 0 | Synced! |
| +211s | node1 | 43 | 0 | Synced! |
| +211s | node2 | 43 | 0 | Synced! |
| +211s | node3 | 43 | 0 | Synced! |
| +221s | node1 | 45 | 0 | Synced! |
| +221s | node2 | 45 | 0 | Synced! |
| +221s | node3 | 45 | 0 | Synced! |
| +231s | node1 | 47 | 0 | Synced! |
| +231s | node2 | 47 | 0 | Synced! |
| +231s | node3 | 47 | 0 | Synced! |
| +241s | node1 | 49 | 29 | Synced! |
| +241s | node2 | 49 | 29 | Synced! |
| +241s | node3 | 49 | 29 | Synced! |
| +251s | node1 | 51 | 29 | Synced! |
| +251s | node2 | 51 | 29 | Synced! |
| +251s | node3 | 51 | 29 | Synced! |
| +261s | node1 | 53 | 29 | Synced! |
| +261s | node2 | 53 | 29 | Synced! |
| +261s | node3 | 53 | 29 | Synced! |
| +271s | node1 | 55 | 29 | Synced! |
| +271s | node2 | 55 | 29 | Synced! |
| +271s | node3 | 55 | 29 | Synced! |

## What this means for operators

Every validator in this drill adopted the new protocol version and stayed in consensus. No action needed for the scenario tested — consider widening the scenario (more validators, more realistic quorum) before treating this as a green light.

## What this does not prove

This drill ran on a small, local topology with throwaway keys and no real network load. It does not prove how a real Mainnet upgrade with many more validators, real traffic, and real geographic/network diversity will behave — only that the specific scenario tested here produced the outcome above, under these exact conditions.
