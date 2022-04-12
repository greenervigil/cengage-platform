import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext"
import { CourseContext } from '../../context/CourseContext';
import { Header } from 'common-experience-library';
import { Drawer, DrawerPosition } from "react-magma-dom";

const AppHeader = () => {
    const auth = useContext(AuthContext);
    const course = useContext(CourseContext);
    const [ showDrawer, setShowDrawer ] = useState(false);
    const { ssoFirstName, ssoLastName } = auth ? auth.authState : {ssoFirstName: '', ssoLastName: ''};
    const courseName = course ? course.courseState.course.courseName : '';

    return (
        <>
            <Header 
                courseName={ courseName }
                userName={`${ssoFirstName} ${ssoLastName}`}
                onMenuClick={() => setShowDrawer(true) }
                onSearchClick={() => {}}
            />
            <Drawer 
                onClose={() => setShowDrawer(false)} 
                isOpen={showDrawer}
                position={DrawerPosition.left}    
            />
        </>
    ); 
}

export default AppHeader;