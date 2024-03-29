var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');

var async = require('async');
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

exports.index = function(req, res) {
    async.parallel(
        {
            book_count: function(callback) {
                Book.count({}, callback); // Pass an empty object as match condition to find all documents of this collection
            },
            book_instance_count: function(callback) {
                BookInstance.count({}, callback);
            },
            book_instance_available_count: function(callback) {
                BookInstance.count({ status: 'Available' }, callback);
            },
            author_count: function(callback) {
                Author.count({}, callback);
            },
            genre_count: function(callback) {
                Genre.count({}, callback);
            }
        },
        function(err, results) {
            res.render('index', {
                title: '本地图书馆主页',
                error: err,
                data: results
            });
        }
    );
};

// 显示完整的藏书列表
exports.book_list = (req, res, next) => {
    Book.find({}, 'title author')
        .populate('author')
        .exec(function(err, list_books) {
            if (err) {
                return next(err);
            }
            //Successful, so render
            res.render('book_list', {
                title: 'Book List',
                book_list: list_books
            });
        });
};

// 为每种藏书显示详细信息的页面
exports.book_detail = (req, res, next) => {
    async.parallel(
        {
            book: callback =>
                Book.findById(req.params.id)
                    .populate('author')
                    .populate('genre')
                    .exec(callback),
            book_instance: callback =>
                BookInstance.find({ book: req.params.id }).exec(callback)
        },
        function(err, results) {
            if (err) {
                return next(err);
            }
            if (results.book == null) {
                let err = new Error('Book not found');
                err.status = 404;
                return next(err);
            }
            res.render('book_detail', {
                title: 'Title',
                book: results.book,
                book_instances: results.book_instance
            });
        }
    );
};

// 由 GET 显示创建藏书的表单
exports.book_create_get = (req, res, next) => {
    async.parallel(
        {
            authors: callback => Author.find(callback),
            genres: callback => Genre.find(callback)
        },
        function(err, results) {
            if (err) {
                return next(err);
            }
            res.render('book_form', {
                title: 'Create Book',
                authors: results.authors,
                genres: results.genres
            });
        }
    );
};

// 由 POST 处理藏书创建操作
exports.book_create_post = [
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined') {
                req.body.genre = [];
            } else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    },

    body('title', 'Title must not be empty.')
        .isLength({ min: 1 })
        .trim(),
    body('author', 'Author must not be empty.')
        .isLength({ min: 1 })
        .trim(),
    body('summary', 'Summary must not be empty.')
        .isLength({ min: 1 })
        .trim(),
    body('isbn', 'ISBN must not be empty.')
        .isLength({ min: 1 })
        .trim(),

    sanitizeBody('*')
        .trim()
        .escape(),
    sanitizeBody('genre.*')
        .trim()
        .escape(),

    (req, res, next) => {
        const errors = validationResult(req);

        let book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
        });

        if (!errors.isEmpty()) {
            async.parallel(
                {
                    authors: callback => Author.find(callback),
                    genres: callback => Genre.find(callback)
                },
                function(err, results) {
                    if (err) {
                        return next(err);
                    }
                    for (let i = 0; i < results.genres.length; i++) {
                        if (book.genre.indexOf(results.genres[i]._id) > -1) {
                            results.genres[i].checked = 'true';
                        }
                    }
                    res.render('book_form', {
                        title: 'Create Book',
                        authors: results.authors,
                        genres: results.genres,
                        book: book,
                        errors: errors.array()
                    });
                }
            );
            return;
        } else {
            book.save(function(err) {
                if (err) {
                    return next(err);
                }
                res.redirect(book.url);
            });
        }
    }
];

// 由 GET 显示删除藏书的表单
exports.book_delete_get = (req, res) => {
    async.parallel(
        {
            book: callback =>
                Book.findById(req.params.id)
                    .populate('author')
                    .populate('genre')
                    .exec(callback),
            book_bookinstances: callback =>
                BookInstance.find({ book: req.params.id }).exec(callback)
        },
        function(err, results) {
            if (err) {
                return next(err);
            }
            if (results.book == null) {
                res.redirect('/catalog/books');
            }
            res.render('book_delete', {
                title: 'Delete Book',
                book: results.book,
                book_instances: results.book_bookinstances
            });
        }
    );
};

// 由 POST 处理藏书删除操作
exports.book_delete_post = (req, res, next) => {
    async.parallel(
        {
            book: callback =>
                Book.findById(req.params.id)
                    .populate('author')
                    .populate('genre')
                    .exec(callback),
            book_bookinstances: callback =>
                BookInstance.find({ book: req.params.id }).exec(callback)
        },
        function(err, results) {
            if (err) {
                return next(err);
            }
            if (results.book_bookinstances.length > 0) {
                res.render('book_delete', {
                    title: 'Delete Book',
                    book: results.book,
                    book_instances: results.book_bookinstances
                });
                return;
            } else {
                Book.findByIdAndRemove(req.body.id, function deleteBook(err) {
                    if (err) {
                        return next(err);
                    }
                    res.redirect('/catalog/books');
                });
            }
        }
    );
};

// 由 GET 显示更新藏书的表单
exports.book_update_get = (req, res, next) => {
    async.parallel(
        {
            book: callback =>
                Book.findById(req.params.id)
                    .populate('author')
                    .populate('genre')
                    .exec(callback),
            authors: callback => Author.find(callback),
            genres: callback => Genre.find(callback)
        },
        function(err, results) {
            if (err) {
                return next(err);
            }
            if (results.book == null) {
                let err = new Error('Book not found');
                err.status = 404;
                return next(err);
            }

            for (
                let all_g_iter = 0;
                all_g_iter < results.genres.length;
                all_g_iter++
            ) {
                for (
                    let book_g_iter = 0;
                    book_g_iter < results.book.genre.length;
                    book_g_iter++
                ) {
                    if (
                        results.genres[all_g_iter]._id.toString() ==
                        results.book.genre[book_g_iter]._id.toString()
                    ) {
                        results.genres[all_g_iter].checked = 'true';
                    }
                }
            }

            res.render('book_form', {
                title: 'Update Book',
                authors: results.authors,
                genres: results.genres,
                book: results.book
            });
        }
    );
};

// 由 POST 处理藏书更新操作
exports.book_update_post = [
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (req.body.genre === 'undefined') {
                req.body.genre = [];
            } else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    },

    body('title', 'Title must not be empty.')
        .isLength({ min: 1 })
        .trim(),
    body('author', 'Author must not be empty.')
        .isLength({ min: 1 })
        .trim(),
    body('summary', 'Summary must not be empty.')
        .isLength({ min: 1 })
        .trim(),
    body('isbn', 'ISBN must not be empty.')
        .isLength({ min: 1 })
        .trim(),

    sanitizeBody('title')
        .trim()
        .escape(),
    sanitizeBody('author')
        .trim()
        .escape(),
    sanitizeBody('summary')
        .trim()
        .escape(),
    sanitizeBody('isbn')
        .trim()
        .escape(),
    sanitizeBody('genre.*')
        .trim()
        .escape(),

    (req, res, next) => {
        const errors = validationResult(req);

        let book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: typeof req.body.genre === 'undefined' ? [] : req.body.genre,
            _id: req.params.id
        });

        if (!errors.isEmpty()) {
            async.parallel(
                {
                    authors: callback => Author.find(callback),
                    genres: callback => Genre.find(callback)
                },
                function(err, results) {
                    if (err) {
                        return next(err);
                    }
                    for (let i = 0; i < results.genres.length; i++) {
                        if (book.genre.indexOf(results.genres[i]._id) > -1) {
                            results.genres[i].checked = 'true';
                        }
                    }
                    res.render('book_form', {
                        title: 'Update Book',
                        authors: results.authors,
                        genres: results.genres,
                        book: book,
                        errors: errors.array()
                    });
                }
            );
            return;
        } else {
            Book.findByIdAndUpdate(req.params.id, book, {}, function updateBook(
                err,
                thebook
            ) {
                if (err) {
                    return next(err);
                }
                res.redirect(thebook.url);
            });
        }
    }
];
