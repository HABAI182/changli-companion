"""Stage the official eye-layer export; retain the released default model."""
import prepare_eye_deform_runtime as staging

staging.SOURCE = staging.HERE / 'build/editor-export-eye-layers-v2-20261001'
staging.TARGET = staging.HERE.parents[1] / 'public/models/changli/live-eye-layers-v2-candidate'
staging.NAME = 'ChangliEyeLayersV2'

if __name__ == '__main__':
    staging.main()
