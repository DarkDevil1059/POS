export const formatCurrency = (amount: number | string | null | undefined): string => {
    if (amount === null || amount === undefined) return '₹0';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '₹0';

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(numericAmount);
};
