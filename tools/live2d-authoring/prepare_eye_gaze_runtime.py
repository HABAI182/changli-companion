"""Stage the official gaze export without replacing the released default."""
import prepare_eye_deform_runtime as staging

staging.SOURCE = staging.HERE / 'build/editor-export-eye-gaze-v1-20261001'
staging.TARGET = staging.HERE.parents[1] / 'public/models/changli/live-eye-gaze-v1-candidate'
staging.NAME = 'ChangliEyeGazeV1'

if __name__ == '__main__':
    staging.main()
