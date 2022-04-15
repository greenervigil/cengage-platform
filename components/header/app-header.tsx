import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext"
import { CourseContext } from '../../context/CourseContext';
import { Header, Search } from 'common-experience-library';
import { Drawer, DrawerPosition } from "react-magma-dom";

const AppHeader = () => {
    const auth = useContext(AuthContext);
    const course = useContext(CourseContext);
    const [ showMenuDrawer, setShowMenuDrawer ] = useState(false);
    const [ showSearchDrawer, setShowSearchDrawer ] = useState(false);
    const { ssoFirstName, ssoLastName } = auth ? auth.authState : {ssoFirstName: '', ssoLastName: ''};
    const courseName = course ? course.courseState.course.courseName : '';

    return (
        <>
            <Header 
                courseName={ courseName }
                userName={`${ssoFirstName} ${ssoLastName}`}
                onMenuClick={() => setShowMenuDrawer(true) }
                onSearchClick={() => setShowSearchDrawer(true)}
            />
            <Drawer 
                onClose={() => setShowMenuDrawer(false)} 
                isOpen={showMenuDrawer}
                position={DrawerPosition.left}    
            />
            <Search 
                onClose={() => setShowSearchDrawer(false)} 
                isOpen={showSearchDrawer}
                onSearch={() => {}}   
            />
        </>
    ); 
}

export default AppHeader;