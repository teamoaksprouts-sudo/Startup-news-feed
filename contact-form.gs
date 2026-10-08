// Apps Script for the Contact page. Create a "Contacts" tab (Time, Name, Email, Message) in your Sheet,
// then Extensions > Apps Script > paste > Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
// Paste the /exec URL into the Settings tab as contact_form_url.
function doPost(e){
  try{
    var d=JSON.parse(e.postData.contents);
    if(d.formType!=="contact") return out({ok:false,error:"bad type"});
    var sh=SpreadsheetApp.getActive().getSheetByName("Contacts");
    sh.appendRow([new Date(),String(d.name).slice(0,100),String(d.email).slice(0,200),String(d.message).slice(0,3000)]);
    return out({ok:true});
  }catch(err){return out({ok:false,error:String(err)});}
}
function out(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
