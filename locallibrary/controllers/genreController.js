const Genre = require('../models/genre');
const Book = require('../models/book');
const async = require('async');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// 显示完整的藏书种类列表
exports.genre_list = (req, res, next) => {
    Genre.find()
        .sort([['name', 'ascending']])
        .exec(function(err, list_genres) {
            if (err) {
                return next(err);
            }
            res.render('genre_list', {
                title: 'Genre List',
                genre_list: list_genres
            });
        });
};

// 为每一类藏书显示详细信息的页面
exports.genre_detail = (req, res, next) => {
    async.parallel(
        {
            genre: callback => Genre.findById(req.params.id).exec(callback),
            genre_books: callback =>
                Book.find({ genre: req.params.id }).exec(callback)
        },
        function(err, results) {
            if (err) {
                return next(err);
            }
            if (results.genre == null) {
                let err = new Error('Genre not found');
                err.status = 404;
                return next(err);
            }
            res.render('genre_detail', {
                title: 'Genre Detail',
                genre: results.genre,
                genre_books: results.genre_books
            });
        }
    );
};

// 由 GET 显示创建藏书种类的表单
exports.genre_create_get = (req, res) => {
    res.render('genre_form', { title: 'Create Genre' });
};

// 由 POST 处理藏书种类创建操作
exports.genre_create_post = [
    // 验证 name 字段是否为空
    body('name', 'Genre name required')
        .isLength({ min: 1 })
        .trim(),

    // sanitize(trim and escape) name 字段
    sanitizeBody('name')
        .trim()
        .escape(),

    // 处理 验证和 sanitization 后的请求
    (req, res, next) => {
        const errors = validationResult(req);
        let genre = new Genre({
            name: req.body.name
        });

        if (!errors.isEmpty()) {
            res.render('genre_form', {
                title: 'Create Genre',
                genre: genre,
                errors: errors.array()
            });
            return;
        } else {
            Genre.findOne({ name: req.body.name }).exec(function(
                err,
                found_genre
            ) {
                if (err) {
                    return next(err);
                }
                if (found_genre) {
                    res.redirect(found_genre.url);
                } else {
                    genre.save(function(err) {
                        if (err) {
                            return next(err);
                        }
                        res.redirect(genre.url);
                    });
                }
            });
        }
    }
];

// 由 GET 显示删除藏书种类的表单
exports.genre_delete_get = (req, res, next) => {
    async.parallel(
        {
            genre: callback => Genre.findById(req.params.id).exec(callback),
            genre_books: callback =>
                Book.find({ genre: req.params.id }).exec(callback)
        },
        function(err, results) {
            if (err) {
                return next(err);
            }
            res.render('genre_delete', {
                title: 'Delete Genre',
                genre: results.genre,
                genre_books: results.genre_books
            });
        }
    );
};

// 由 POST 处理藏书种类删除操作
exports.genre_delete_post = (req, res) => {
    async.parallel(
        {
            genre: callback => Genre.findById(req.params.id).exec(callback),
            genre_books: callback =>
                Book.find({ genre: req.params.id }).exec(callback)
        },
        function(err, results) {
            if (err) {
                return next(err);
            }
            if (results.genre_books.length > 0) {
                res.render('genre_delete', {
                    title: 'Delete Genre',
                    genre: results.genre,
                    genre_books: results.genre_books
                });
                return;
            } else {
                Genre.findByIdAndRemove(req.body.id, function deleteGenre(err) {
                    if (err) { return next(err); }
                    res.redirect('/catalog/genres');
                })
            }
        }
    );
};

// 由 GET 显示更新藏书种类的表单
exports.genre_update_get = (req, res) => {
    res.send('未实现：藏书种类更新表单的 GET');
};

// 由 POST 处理藏书种类更新操作
exports.genre_update_post = (req, res) => {
    res.send('未实现：更新藏书种类的 POST');
};
