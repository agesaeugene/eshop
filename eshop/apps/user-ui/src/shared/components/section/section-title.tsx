import TitleBorder from "apps/user-ui/src/assets/svgs/title-border";
import React from "react";

const SectionTitle = ({ title }: { title: string }) => {
    return (
        <div className="relative">
            <h1 className="md:text-3xl text-xl relative z-10 font-semibold">
                {title}
                <TitleBorder className="absolute top-[46%] left-0 -z-10 text-blue-500" />
            </h1>
        </div>
    );
};

export default SectionTitle;