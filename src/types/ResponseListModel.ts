export type ResponseListModel<T> = {
    items: T[];
    total: number;
    page: number;
    size: number;
};