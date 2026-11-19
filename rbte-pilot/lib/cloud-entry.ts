// Only drafts saved through the manual cloud form may refill the editor.
// Older content remains in the database and history until the user saves a new version.
export const MANUAL_CLOUD_VERSION='manual-v1';
export function cloudEntryFields(step:string,initial:Record<string,string>){
 return ['cloud','practice'].includes(step)&&initial.__cloudEntry!==MANUAL_CLOUD_VERSION?{}:initial;
}
