export function paginate(page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const limit = pageSize;
    return {
      offset,
      limit,
    };
  }