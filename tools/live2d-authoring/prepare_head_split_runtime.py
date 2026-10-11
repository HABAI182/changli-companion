"""Stage official head/desk split; never change the default pet entry."""
import prepare_eye_deform_runtime as staging

staging.SOURCE = staging.HERE / 'build/editor-export-head-split-v1-20261001'
staging.TARGET = staging.HERE.parents[1] / 'public/models/changli/live-head-split-v1-candidate'
staging.NAME = 'ChangliHeadSplitV1'

if __name__ == '__main__':
    staging.main()
