import React from 'react';

const SplitPaneLayout = ({ leftContent, rightContent }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-full overflow-y-auto lg:overflow-hidden scrollbar-thin">
            {/* Left Column: Side content (Input, etc) */}
            <div className="flex flex-col h-auto lg:h-full lg:overflow-y-auto lg:col-span-1">
                {leftContent}
            </div>

            {/* Right Column: Main content (Results, etc) */}
            <div className="flex flex-col h-auto lg:h-full lg:overflow-hidden min-h-[300px] lg:col-span-2">
                {rightContent}
            </div>
        </div>
    );
};

export default SplitPaneLayout;
