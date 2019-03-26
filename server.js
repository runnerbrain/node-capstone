const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');

const {
    DATABASE_URL,
    PORT
} = require('./config');
const {
    IssueModel,
    ContributorModel,
    CategoryModel
} = require('./models');

const app = express();
const router = express.Router();

app.use(express.static('public'));

app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(bodyParser.json());

app.get('/', function (request, response) {
    response.sendFile('index.html');
});


app.get('/issues', (req, res) => {
    IssueModel
        .find()
        .then(issues => {
            console.log(issues);
            res.json(issues.map(issue => issue.serialize()));
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({
                error: 'Something is wrong'
            });
        });
});

app.get('/issues/:issue_id/comments', (req, res) => {
    let _issue_id = req.params.issue_id;

    IssueModel
        .findById(_issue_id, {
            '_id': 0,
            'follow_up': 1
        })
        .then(issues => {
            res.json(issues);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send({
                error: 'Something went wrong in the /issues/:issue_id/comments endpoint'
            })
        })
});


app.get('/issues/:status/:category', (req, res) => {
    const _status = req.params.status;
    const _categ = req.params.category || 'all';
    let query = {};
    if (_status !== '' && _status !== 'all') {
        var query1;
        switch (_status) {
            case 'due':
                query = {
                    due_date: {
                        '$eq': new Date()
                    }
                };
                break;
            case 'overdue':
                query = {
                    due_date: {
                        $lt: new Date()
                    }
                };
                break;
            case 'pending':
                query = {
                    due_date: {
                        '$gt': new Date()
                    }
                };
            default:
                break;
        }
    }
    if (_categ !== '' && _categ !== 'all') {
        query.category = _categ;
    }

    IssueModel
        .find(query)
        .then(issues => {
            res.json(issues.map(issue => issue.serialize()));
        })
        .catch(err => {
            console.error(err);
            res.status(500).send({
                error: "Something went wrong in the /issues/:status/:catgory endpoint"
            });
        })
})

app.get('/contributors', (req, res) => {
    ContributorModel
        .find()
        .then(contributors => {
            res.json(contributors);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send({
                error: "Something went wrong in the /contributors endpoint"
            });
        })

})

app.get('/categories', (req, res) => {
    CategoryModel
        .find({}, {
            _id: 0,
            category: 1
        })
        .then(categories => {
            res.json(categories);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send({
                error: "Something went wrong in the /categories endpoint"
            });
        })
})




// app.get('/issues/:filter',(req,res)=>{
//     const dueArray = ["due","overdue","pending"];
//     const categArray = ["categ1","categ2","categ3"];
//     const _filter = req.params.filter;

//     // let currentDate = new Date();
//     let due_param = dueArray.indexOf(_filter);
//     let categ_param = categArray.indexOf(_filter);
//     //console.log(due_param);
//     if(due_param >= 0){
//         let due_filter = _filter;
//         switch (due_filter) {
//             case 'due':
//                 query = {due_date: {'$eq': new Date()}};
//             break;
//             case 'overdue':
//                 query = {due_date: {'$lt': new Date()}};
//             break;
//             case 'pending':
//                 query = {due_date: {'$gt': new Date()}};
//             default:
//                 break;
//         }   
//     }
//     else if(categ_param >= 0){

//     }
//     console.log(query);
//     IssueModel
//     .find(query)
//     .then(issues=> {
//         res.json(issues.map(issue => issue.serialize()));
//     })
//     .catch(err => {
//         console.error(err);
//         res.status(500).json({error: 'Something is wrong'});
//     });
// });



app.post('/issues', (req, res) => {
    console.log(req.body);
    let _title = req.body.form_issue_title;
    let _description = req.body.form_issue_description;
    let _created_at_now = new Date().toISOString();
    let _category = req.body.category;
    let _due_date = req.body.issue_due_date;
    

    let _contributor_number = req.body.contributor_number;
    console.log('The number of contributors is: ' + req.body.contributor_number)
    let _contributors = [];

    for (let i = 0; i < _contributor_number; i++) {
        let index = `contributor_${(i+1)}`;
        let current = req.body[`${index}`];
        let query = {
            username: current
        };

        ContributorModel
            .find(query)
            .then(contributor => {
                console.log(contributor[0]._id);
                let contributorObj = {
                    _id: contributor[0]._id
                };
                _contributors.push(contributorObj);
            })
            .catch(err => {
                console.error(err);
                res.status(501).json({
                    Error: 'Something went wrong with finding a contributor'
                });
            })
    }

    //console.log(_contributors);   
    IssueModel
        .create({
            title: _title,
            description: _description,
            created_at: _created_at_now,
            category: _category,
            due_date: _due_date,
            status: _status
        })
        .then(issue =>
            IssueModel.where({
                _id: issue._id
            })
            .update({
                $set: {
                    contributors: _contributors
                }
            })
            .then(updatedIssue => {
                res.status(201).json({
                    message: 'All is well'
                })
            })
        )
        .catch(err => {
            console.error(err);
            res.status(500).json({
                error: 'Someting went wrong in the post /issues endpoint'
            });
        })
});

app.post('/issues/:issue_id/comments', (req, res) => {});


app.post('/categories', (req, res) => {
    let _category = req.body.category;
    CategoryModel
        .create({
            category: _category
        })
        .then(Category => res.status(201).json({
            category: Category
        }))
        .catch(err => {
            console.error(err);
            res.status(500).json({
                error: 'Something went wrong with the /category endpoint'
            });
        })
})

app.post('/contributor', (req, res) => {
    let _firstName = req.body.firstName;
    let _lastName = req.body.lastName;
    let _username = req.body.username;
    ContributorModel
        .create({
            firstName: _firstName,
            lastName: _lastName,
            username: _username
        })
        .then(Contributor => res.status(201).json({
            message: 'Added a new contributor'
        }))
        .catch(err => {
            console.error(err);
            res.status(500).json({
                error: 'Something went wrong with the post /contributors endpoint'
            });
        })
})

app.put('issues/:issue_id', (req, res) => {});
app.put('/issues/:issue_id/:comment_id', (req, res) => {});

app.delete('/issues/:issue_id', (req, res) => {});
app.delete('/issues/:issue_id/:comment_id/', (req, res) => {})


let server;

function runServer(databaseUrl, port = PORT) {
    return new Promise((resolve, reject) => {
        mongoose.connect(databaseUrl, err => {
            if (err) {
                return reject(err);
            }
            server = app.listen(port, () => {
                    console.log(`Your app is listening on port ${port}`);
                    resolve();
                })
                .on('error', err => {
                    mongoose.disconnect();
                    reject(err);
                });
        });
    });
}

function closeServer() {
    return mongoose.disconnect().then(() => {
        return new Promise((resolve, reject) => {
            console.log('Closing server');
            server.close(err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });
}

//app.listen(process.env.PORT || 8080);
if (require.main === module) {
    runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = {
    app
}