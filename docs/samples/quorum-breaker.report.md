# Upgrade Drill: quorum-breaker

Enough validators go down that the remaining ones can no longer reach quorum at all.

**Overall verdict: 🛑 NETWORK_STALLED**

None of the 5 validators ended in a synced state.

## Per-node outcome

| Node | Final state | Protocol version | Explanation |
| --- | --- | --- | --- |
| node1 | Joining SCP | 0 | node1 ended in state "Joining SCP", not synced. |
| node2 | Joining SCP | 0 | node2 ended in state "Joining SCP", not synced. |
| node3 | Joining SCP | 0 | node3 ended in state "Joining SCP", not synced. |
| node4 | unknown | unknown | node4 was unreachable at the last observation. |
| node5 | unknown | unknown | node5 was unreachable at the last observation. |

## Timeline

| Time | Node | Ledger | Protocol | State |
| --- | --- | --- | --- | --- |
| +0s | node1 | — | — | — |
| +0s | node2 | 1 | 0 | Synced! |
| +0s | node3 | 1 | 0 | Synced! |
| +0s | node4 | 1 | 0 | Synced! |
| +0s | node5 | 1 | 0 | Synced! |
| +10s | node1 | 3 | 0 | Synced! |
| +10s | node2 | 3 | 0 | Synced! |
| +10s | node3 | 3 | 0 | Synced! |
| +10s | node4 | 3 | 0 | Synced! |
| +10s | node5 | 3 | 0 | Synced! |
| +20s | node1 | 5 | 0 | Synced! |
| +20s | node2 | 5 | 0 | Synced! |
| +20s | node3 | 5 | 0 | Synced! |
| +20s | node4 | 5 | 0 | Synced! |
| +20s | node5 | 5 | 0 | Synced! |
| +30s | node1 | 7 | 0 | Synced! |
| +30s | node2 | 7 | 0 | Synced! |
| +30s | node3 | 7 | 0 | Synced! |
| +30s | node4 | 7 | 0 | Synced! |
| +30s | node5 | 7 | 0 | Synced! |
| +40s | node1 | 9 | 0 | Synced! |
| +40s | node2 | 9 | 0 | Synced! |
| +40s | node3 | 9 | 0 | Synced! |
| +40s | node4 | 9 | 0 | Synced! |
| +40s | node5 | 9 | 0 | Synced! |
| +50s | node1 | 11 | 0 | Synced! |
| +50s | node2 | 11 | 0 | Synced! |
| +50s | node3 | 11 | 0 | Synced! |
| +50s | node4 | 11 | 0 | Synced! |
| +50s | node5 | 11 | 0 | Synced! |
| +60s | node1 | 13 | 0 | Synced! |
| +60s | node2 | 13 | 0 | Synced! |
| +60s | node3 | 13 | 0 | Synced! |
| +60s | node4 | 13 | 0 | Synced! |
| +60s | node5 | 13 | 0 | Synced! |
| +70s | node1 | 15 | 0 | Synced! |
| +70s | node2 | 15 | 0 | Synced! |
| +70s | node3 | 15 | 0 | Synced! |
| +70s | node4 | 15 | 0 | Synced! |
| +70s | node5 | 15 | 0 | Synced! |
| +80s | node1 | 17 | 0 | Synced! |
| +80s | node2 | 17 | 0 | Synced! |
| +80s | node3 | 17 | 0 | Synced! |
| +80s | node4 | 17 | 0 | Synced! |
| +80s | node5 | 17 | 0 | Synced! |
| +90s | node1 | 18 | 0 | Synced! |
| +90s | node2 | 18 | 0 | Synced! |
| +90s | node3 | 18 | 0 | Synced! |
| +90s | node4 | 18 | 0 | Synced! |
| +90s | node5 | 18 | 0 | Synced! |
| +90s | node1 | 18 | 0 | Synced! |
| +90s | node2 | 18 | 0 | Synced! |
| +90s | node3 | 18 | 0 | Synced! |
| +90s | node4 | — | — | — |
| +90s | node5 | 18 | 0 | Synced! |
| +91s | node1 | 18 | 0 | Synced! |
| +91s | node2 | 18 | 0 | Synced! |
| +91s | node3 | 18 | 0 | Synced! |
| +91s | node4 | — | — | — |
| +91s | node5 | — | — | — |
| +101s | node1 | 18 | 0 | Synced! |
| +101s | node2 | 18 | 0 | Synced! |
| +101s | node3 | 18 | 0 | Synced! |
| +101s | node4 | — | — | — |
| +101s | node5 | — | — | — |
| +111s | node1 | 18 | 0 | Synced! |
| +111s | node2 | 18 | 0 | Synced! |
| +111s | node3 | 18 | 0 | Synced! |
| +111s | node4 | — | — | — |
| +111s | node5 | — | — | — |
| +121s | node1 | 18 | 0 | Joining SCP |
| +121s | node2 | 18 | 0 | Joining SCP |
| +121s | node3 | 18 | 0 | Joining SCP |
| +121s | node4 | — | — | — |
| +121s | node5 | — | — | — |
| +131s | node1 | 18 | 0 | Joining SCP |
| +131s | node2 | 18 | 0 | Joining SCP |
| +131s | node3 | 18 | 0 | Joining SCP |
| +131s | node4 | — | — | — |
| +131s | node5 | — | — | — |
| +141s | node1 | 18 | 0 | Joining SCP |
| +141s | node2 | 18 | 0 | Joining SCP |
| +141s | node3 | 18 | 0 | Joining SCP |
| +141s | node4 | — | — | — |
| +141s | node5 | — | — | — |
| +151s | node1 | 18 | 0 | Joining SCP |
| +151s | node2 | 18 | 0 | Joining SCP |
| +151s | node3 | 18 | 0 | Joining SCP |
| +151s | node4 | — | — | — |
| +151s | node5 | — | — | — |
| +161s | node1 | 18 | 0 | Joining SCP |
| +161s | node2 | 18 | 0 | Joining SCP |
| +161s | node3 | 18 | 0 | Joining SCP |
| +161s | node4 | — | — | — |
| +161s | node5 | — | — | — |
| +171s | node1 | 18 | 0 | Joining SCP |
| +171s | node2 | 18 | 0 | Joining SCP |
| +171s | node3 | 18 | 0 | Joining SCP |
| +171s | node4 | — | — | — |
| +171s | node5 | — | — | — |
| +181s | node1 | 18 | 0 | Joining SCP |
| +181s | node2 | 18 | 0 | Joining SCP |
| +181s | node3 | 18 | 0 | Joining SCP |
| +181s | node4 | — | — | — |
| +181s | node5 | — | — | — |
| +191s | node1 | 18 | 0 | Joining SCP |
| +191s | node2 | 18 | 0 | Joining SCP |
| +191s | node3 | 18 | 0 | Joining SCP |
| +191s | node4 | — | — | — |
| +191s | node5 | — | — | — |
| +201s | node1 | 18 | 0 | Joining SCP |
| +201s | node2 | 18 | 0 | Joining SCP |
| +201s | node3 | 18 | 0 | Joining SCP |
| +201s | node4 | — | — | — |
| +201s | node5 | — | — | — |
| +211s | node1 | 18 | 0 | Joining SCP |
| +211s | node2 | 18 | 0 | Joining SCP |
| +211s | node3 | 18 | 0 | Joining SCP |
| +211s | node4 | — | — | — |
| +211s | node5 | — | — | — |

## What this means for operators

No validator ended in a synced state — the network as a whole stopped closing ledgers, not just the upgrade vote. This is the most severe outcome: investigate the quorum configuration and validator availability immediately.

## What this does not prove

This drill ran on a small, local topology with throwaway keys and no real network load. It does not prove how a real Mainnet upgrade with many more validators, real traffic, and real geographic/network diversity will behave — only that the specific scenario tested here produced the outcome above, under these exact conditions.
