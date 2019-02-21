const BookInstance = require('../models/bookinstance');
const Book = require('../models/book');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// 显示完整的藏书副本列表
exports.bookinstance_list = (req, res, next) => {
    BookInstance.find()
        .populate('book')
        .exec(function(err, list_bookinstance) {
            if (err) {
                return next(err);
            }
            res.render('bookinstance_list', {
                title: 'Book Instance List',
                bookinstance_list: list_bookinstance
            });
        });
};

// 为藏书的每一本副本显示详细信息的页面
exports.bookinstance_detail = (req, res, next) => {
    BookInstance.findById(req.params.id)
        .populate('book')
        .exec(function(err, bookinstance) {
            if (err) {
                return next(err);
            }
            if (bookinstance == null) {
                let err = new Error('Book copy not found');
                err.status = 404;
                return next(err);
            }
            res.render('bookinstance_detail', {
                title: 'Book',
                bookinstance: bookinstance
            });
        });
};

// 由 GET 显示创建藏书副本的表单
exports.bookinstance_create_get = (req, res, next) => {
    Book.find({}, 'title').exec(function(err, books) {
        if (err) {
            return next(err);
        }
        res.render('bookinstance_form', {
            title: 'Create BookInstance',
            book_list: books
        });
    });
};

// 由 POST 处理藏书副本创建操作
exports.bookinstance_create_post = [
    body('book', 'Book must be specified')
        .isLength({ min: 1 })
        .trim(),
    body('imprint', 'Imprint must be specified')
        .isLength({ min: 1 })
        .trim(),
    body('due_back', 'Invalid date')
        .optional({ checkFalsy: true })
        .isISO8601(),

    sanitizeBody('book')
        .trim()
        .escape(),
    sanitizeBody('imprint')
        .trim()
        .escape(),
    sanitizeBody('status')
        .trim()
        .escape(),
    sanitizeBody('due_back').toDate(),

    (req, res, next) => {
        const errors = validationResult(req);

        let bookinstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
        });

        if (!errors.isEmpty()) {
            Book.find({}, 'title').exec(function(err, books) {
                if (err) {
                    return next(err);
                }
                res.render('bookinstance_form', {
                    title: 'Create BookInstance',
                    book_list: books,
                    selected_book: bookinstance.book_id,
                    errors: errors.array(),
                    bookinstance: bookinstance
                });
            });
            return;
        } else {
            bookinstance.save(function(err) {
                if (err) {
                    return next(err);
                }
                res.render(bookinstance.url);
            });
        }
    }
];

// 由 GET 显示删除藏书副本的表单
exports.bookinstance_delete_get = (req, res) => {
    res.send('未实现：藏书副本删除表单的 GET');
};

// 由 POST 处理藏书副本删除操作
exports.bookinstance_delete_post = (req, res) => {
    res.send('未实现：删除藏书副本的 POST');
};

// 由 GET 显示更新藏书副本的表单
exports.bookinstance_update_get = (req, res) => {
    res.send('未实现：藏书副本更新表单的 GET');
};

// 由 POST 处理藏书副本更新操作
exports.bookinstance_update_post = (req, res) => {
    res.send('未实现：更新藏书副本的 POST');
};
