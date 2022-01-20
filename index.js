const express = require('express');
const db = require('./connection/db');
const bcrypt = require('bcrypt');
const flash = require('express-flash');
const session = require('express-session');
const query = require('express/lib/middleware/query');

const app = express();
const upload = require('./middleware/uploadFile');
const PORT = 5000;

let isLogin = false;
let news = [
    {author:'Handlebars Documentation',
    title: 'What is Handlebars?',
    content:'Handlebars is a simple templating language.It uses a template and an input object to generate HTML or other text formats. Handlebars templates look like regular text with embedded Handlebars expressions.',
    postAt: '23 December 2021 13:35 WIB'        
    }
];
const month = [ 
    'January', 
    'February', 
    'March', 
    'April', 
    'May', 
    'June', 
    'July', 
    'August', 
    'September', 
    'October', 
    'November', 
    'December'
];


app.set('view engine','hbs');

app.use('/public',express.static(__dirname+'/public'));
app.use('/uploads',express.static(__dirname+'/uploads'));
app.use(express.urlencoded({extended: false}));
app.use(flash());
app.use(session({
        cookie: {
            maxAge: 2 * 60 * 60 * 1000,
            secure: false,
            httpOnly: true
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave: false,
        secret: 'secretValue'
    })
);


app.get('/', (req,res)=>{
    db.connect(function(err,client,done){
        if (err) throw err;

        client.query('SELECT * FROM public."experience_info"',function(err,result){
            done();
            let data = result.rows;          
            res.render('index',{info: data});

        });

    });
    
});

app.post('/',(req,res)=>{
    db.connect(function(err,client,done){
        if (err) throw err;
        let query = `INSERT INTO public."experience_info"(experience,year) VALUES ('${req.body.experience}','${req.body.year}')`;
        client.query(query,function(err,result){
            if (err) throw err;

            res.redirect('/');
        });

    });     


});

app.get('/blog', (req,res)=>{
    db.connect(function(err,client,done){
       
        if (err) throw err;
       
        let query = `SELECT blog.id, blog.title, blog.content, blog.image, tb_user.name AS author, blog."postAt" 
        FROM public."blog" LEFT JOIN public."tb_user"
        ON blog.author_id = tb_user.id`;
       
        client.query(query,function(err,result){
            done();
            let data = result.rows.map((data)=>{
                return{
                    ...data,
                    isLogin: req.session.isLogin,
                    image: '/uploads/' + data.image,
                    postAt: getTimePost(data.postAt)
                }
                           
            });

            res.render('blog',{
                isLogin: req.session.isLogin,
                news: data,
                user: req.session.user
            });

        });

    });

});

app.post('/blog',upload.single('image'),(req,res)=>{
    let data = req.body;

    if(!(req.session.isLogin)){
        req.flash('danger','Please Login!');
        return res.redirect('/add-blog');
    }

    // if(!(data.title | data.content | data.image)){
    //     req.flash('danger','Please fill all the field!');
    //     return res.redirect('/add-blog');
    // }

    let authorId = req.session.user.id;
    let image = req.file.filename;

    db.connect(function(err,client,done){
        if (err) throw err;
        let query = `INSERT INTO public."blog"(title,content,image,author_id) 
        VALUES ('${data.title}','${data.content}','${image}','${authorId}')`;
       
        client.query(query,function(err,result){
            if (err) throw err;

            res.redirect('/blog');
        });

    });     


});

app.post('/blog/:id',upload.single('image'),(req,res)=>{
    let id = req.params.id;
    let data = req.body;
    let image = req.file.filename;

    
    if(!(req.session.isLogin)){
        req.flash('danger','Please Login!');
        return res.redirect(`/edit-blog/${id}`);
    }

   
    let query = `UPDATE public."blog" SET title='${data.title}', content='${data.content}', image='${image}' WHERE id=${id}`
    db.connect(function(err,client,done){

        client.query(query,function(err,result){
            if (err) throw err;

            res.redirect('/blog');
        });

    });     
})

app.get('/add-experience', (req,res)=>{
    res.render('add-experience');
});

app.get('/contact', (req,res)=>{
    res.render('contact');
});

app.get('/detail-blog/:id', (req,res)=>{
    let id = req.params.id;
    let query = `SELECT blog.id, blog.title, blog.content, blog.image, tb_user.name AS author, blog."postAt" 
    FROM public."blog" LEFT JOIN public."tb_user"
    ON blog.author_id = tb_user.id
    WHERE blog.id=${id}`;
    db.connect(function(err,client,done){
         if (err) throw err;

         client.query(query,function(err,result){
             if (err) throw err;
             let data = result.rows.map((data)=>{
                 return {
                     ...data,
                     isLogin: req.session.isLogin,
                     image: '/uploads/' + data.image,
                     postAt: getTimePost(data.postAt)
                 }
             });
             res.render('detail-blog',{
                isLogin: req.session.isLogin,
                data: data,
                user: req.session.user
                });
         });

    });
});

app.get('/add-blog', (req,res)=>{
    res.render('add-blog');
});

app.get('/edit-blog/:id', (req,res)=>{
    let id = req.params.id;
    
    db.connect(function(err,client,done){
         if (err) throw err;

         client.query(`SELECT * FROM public."blog" WHERE id=${id}`,function(err,result){
             if (err) throw err;
             let data = result.rows;
             res.render('edit-blog',{news: data});
         });

    });
});

app.get('/delete-blog/:id',(req,res)=>{
    let id = req.params.id;

    if(!(req.session.isLogin)){
        req.flash('danger','Please Login!');
        return res.redirect('/blog');
    }

    db.connect(function(err,client,done){
        if (err) throw err;
        
        client.query(`DELETE FROM public."blog" WHERE id= '${id}'`,function(err,result){

            done();
            res.redirect('/blog');
        });

    }); 
});

app.get('/register',(req,res)=>{
    res.render('register');
});

app.post('/register',(req,res)=>{
    const { name, email, password } = req.body;
    const hashpassword = bcrypt.hashSync(password,10);
    const query = `INSERT INTO public."tb_user"(name,email,password) VALUES ('${name}','${email}','${hashpassword}')`;

    db.connect(function(err,client,done){
        if (err) throw err;

        client.query(query,(err,result)=>{
            if (err) throw err;
            res.redirect('/login');

        });

    });
});

app.get('/login',(req,res)=>{
    res.render('login');
});

app.post('/login',(req,res)=>{
    const { email, password } = req.body;

    const query = `SELECT * FROM public."tb_user" WHERE email= '${email}'`;

    db.connect(function(err,client,done){
        if (err) throw err;

        client.query(query,(err,result)=>{
            if (err) throw err;

            if (result.rows.length == 0){
                req.flash('warning', 'your email and password are not match');
                return res.redirect('/login');
            };

            let isMatch = bcrypt.compareSync(password,result.rows[0].password);

           if(isMatch){
               
                req.session.isLogin = true;
                req.session.user = {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email
                };
                req.flash('success', 'Sign in is success');
                res.redirect('/blog');
           }else{
               req.flash('warning', 'your email and password are not match');
               res.redirect('/login');
           }

        });

    });
});

app.get('/signout',(req,res)=>{
    req.session.destroy();
    res.redirect('/blog');
})

app.listen(PORT,()=>{
    console.log(`Server start at ${PORT}` );
});


function getTimePost(UNIX_timestamp){
    let time = new Date(UNIX_timestamp);
    let date = time.getDate();
    let monthIndex = time.getMonth();
    let year = time.getFullYear();

    let hours = time.getHours();
    let minutes = time.getMinutes();

    let result = `${date} ${month[monthIndex]} ${year} ${hours}:${minutes} WIB`;
    return result;
};