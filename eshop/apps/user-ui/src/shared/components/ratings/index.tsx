import HalfStar from "apps/user-ui/src/assets/svgs/HalfStar";
import StarFilled from "apps/user-ui/src/assets/svgs/StarFilled";
import StarOutline from "apps/user-ui/src/assets/svgs/StarOutline";
import React, { FC } from "react";

type Props = {
    rating: number;
};

const Ratings: FC<Props> = ({ rating }) => {
    const stars = [];

    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars.push(<StarFilled key={`star-${i}`} />);
        } else if (i - rating < 1 && i - rating > 0) {
            stars.push(<HalfStar key={`half-${i}`} />);
        } else {
            stars.push(<StarOutline key={`empty-${i}`} />);
        }
    }

    return <div className="flex gap-1">{stars}</div>;
};

export default Ratings;