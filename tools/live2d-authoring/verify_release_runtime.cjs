// One local Vite session; dependency-bound browser checks run serially.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const script of ['verify_input_blink.cjs','verify_desktop_integration.cjs','verify_app_animation_clock.cjs','verify_settings_ui.cjs','verify_pet_menu_ui.cjs']){
 const result=spawnSync(process.execPath,[path.join(__dirname,script)],{stdio:'inherit'});
 if(result.status!==0){process.exitCode=result.status||1;break;}
}
