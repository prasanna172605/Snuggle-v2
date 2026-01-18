// Validation helper for converting Zod errors to standardized format
export const formatZodErrors = (error) => {
    return {
        success: false,
        errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }))
    };
};

module.exports = { formatZodErrors };
