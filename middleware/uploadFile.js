const multer = require('multer');

//initialization multer diskstorage
// create destination file for upload
const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,'uploads');//last parameter is filename storage location
    },
    filename: (req,file,cb)=>{
        cb(null,Date.now() +"-"+ file.originalname);// rename file by => date now + original name
    }
})

const upload = multer({ storage: storage });

module.exports = upload;
