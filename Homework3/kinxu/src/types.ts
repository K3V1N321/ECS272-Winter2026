// Global types and interfaces are stored here.
export interface Margin {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
}

export interface ComponentSize {
    width: number;
    height: number;
}

export interface Point {
    readonly posX: number;
    readonly posY: number;
}

export interface Bar{
    readonly value: number;
}

export interface BookData{
    genre: string;
    publicationYear: number;
    rating_average: number;
    most_popular_country: string;
    age_category: string
    adapted_to_movie: string
}