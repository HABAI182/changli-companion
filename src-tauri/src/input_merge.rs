//! Merge independent Windows observations without retaining input history.
//! Each slot holds only current down state and short-lived timing information.
#[derive(Clone, Copy, Default)]
struct KeyState {
    raw_down: bool,
    poll_down: bool,
    poll_emitted: bool,
    raw_at: Option<u64>,
    poll_at: u64,
    repeat_at: u64,
}
pub struct InputMerge {
    keys: [KeyState; 256],
}
impl Default for InputMerge {
    fn default() -> Self {
        Self {
            keys: [KeyState::default(); 256],
        }
    }
}
impl InputMerge {
    pub fn raw(&mut self, key: usize, down: bool, now: u64) -> bool {
        let Some(state) = self.keys.get_mut(key) else {
            return false;
        };
        if !down {
            state.raw_down = false;
            state.poll_emitted = false;
            return false;
        }
        state.raw_down = true;
        state.raw_at = Some(now);
        // The polling edge may win the race by a few milliseconds. Suppress
        // only the matching edge/repeat; quick re-presses survive raw release.
        if state.poll_down && state.poll_emitted && now.saturating_sub(state.poll_at) < 48 {
            state.poll_emitted = false;
            return false;
        }
        true
    }
    pub fn poll(&mut self, key: usize, down: bool, now: u64, repeat: bool) -> bool {
        let Some(state) = self.keys.get_mut(key) else {
            return false;
        };
        let edge = down && !state.poll_down;
        state.poll_down = down;
        if !down {
            state.poll_emitted = false;
            return false;
        }
        let raw_recent = state
            .raw_at
            .is_some_and(|time| now.saturating_sub(time) < 120);
        if edge {
            state.repeat_at = now + 500;
            if state.raw_down && raw_recent {
                return false;
            }
            state.poll_emitted = true;
            state.poll_at = now;
            return true;
        }
        if repeat && now >= state.repeat_at && !raw_recent {
            state.repeat_at = now + 75;
            state.poll_emitted = true;
            state.poll_at = now;
            return true;
        }
        false
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn both_observation_orders_emit_once_but_raw_repeat_survives() {
        let mut merge = InputMerge::default();
        assert!(merge.raw(65, true, 100));
        assert!(!merge.poll(65, true, 108, true));
        assert!(merge.raw(65, true, 140));
        assert!(!merge.raw(65, false, 150));
        assert!(!merge.poll(65, false, 160, true));
        assert!(merge.poll(65, true, 200, true));
        assert!(!merge.raw(65, true, 208));
        assert!(merge.raw(65, true, 250));
    }
    #[test]
    fn polling_remains_live_when_raw_registration_receives_nothing() {
        let mut merge = InputMerge::default();
        assert!(merge.poll(87, true, 100, true));
        assert!(!merge.poll(87, true, 599, true));
        assert!(merge.poll(87, true, 600, true));
        assert!(!merge.poll(87, false, 610, true));
        assert!(merge.poll(87, true, 620, true));
        assert!(merge.poll(1, true, 100, false));
        assert!(!merge.poll(1, true, 800, false));
        assert!(!merge.poll(1, false, 810, false));
        assert!(merge.poll(1, true, 820, false));
    }
    #[test]
    fn quick_raw_repress_is_not_hidden_by_old_poll_state() {
        let mut merge = InputMerge::default();
        assert!(merge.poll(65, true, 100, true));
        assert!(!merge.raw(65, true, 105));
        assert!(!merge.raw(65, false, 110));
        assert!(merge.raw(65, true, 120));
    }
}
