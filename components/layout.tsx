import { NextPage } from "next";
import { Flex, FlexBehavior, FlexJustify, FlexWrap } from "react-magma-dom";

const Layout: NextPage = ({ children }) => {
    return (
        <Flex 
            behavior={FlexBehavior.container} 
            justify={FlexJustify.center}
            wrap={FlexWrap.wrap}
        >
            { children }
        </Flex>
    )
}

export default Layout;