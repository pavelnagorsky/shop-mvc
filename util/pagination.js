module.exports = (itemsPerPage, page, totalItems) => {
  return (
    {
      currentPage: page,
      hasNextPage: itemsPerPage * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / itemsPerPage)
    }
  )
}