import React, { useState } from "react";
// PatternFly
import {
  Page,
  PageSection,
  PageSectionVariants,
  Tabs,
  Tab,
  TabTitleText,
} from "@patternfly/react-core";
// React Router DOM
import { useNavigate, useParams } from "react-router-dom";
// Components
import ServicesSettings from "./ServicesSettings";
import ServicesMemberOf from "./ServicesMemberOf";
import ServicesManagedBy from "./ServicesManagedBy";
import BreadCrumb, { BreadCrumbItem } from "src/components/layouts/BreadCrumb";
import TitleLayout from "src/components/layouts/TitleLayout";
import { partialServiceToService } from "src/utils/serviceUtils";
// Hooks
import { useAlerts } from "../../hooks/useAlerts";
// Hooks
import { useServiceSettings } from "src/hooks/useServiceSettingsData";
// Redux
import { useAppDispatch } from "src/store/hooks";
import { updateBreadCrumbPath } from "src/store/Global/routes-slice";
import DataSpinner from "src/components/layouts/DataSpinner";

// eslint-disable-next-line react/prop-types
const ServicesTabs = ({ section }) => {
  const { id } = useParams();
  const encodedId = encodeURIComponent(id as string);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [serviceId, setServiceId] = useState("");

  // Data loaded from DB
  const serviceSettingsData = useServiceSettings(id as string);

  // Alerts to show in the UI
  const alerts = useAlerts();

  // Tab
  const [activeTabKey, setActiveTabKey] = useState("settings");

  const handleTabClick = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: number | string
  ) => {
    setActiveTabKey(tabIndex as string);
    id;
    if (tabIndex === "settings") {
      navigate("/services/" + encodedId);
    } else if (tabIndex === "memberof") {
      navigate("/services/" + encodedId + "/memberof_role");
    } else if (tabIndex === "managedby") {
      navigate("/services/" + encodedId + "/managedby_host");
    }
  };

  React.useEffect(() => {
    if (!id) {
      // Redirect to the main page
      navigate("/services");
    } else {
      setServiceId(id);
      // Update breadcrumb route
      const currentPath: BreadCrumbItem[] = [
        {
          name: "Services",
          url: "../services",
        },
        {
          name: id,
          url: "../services/" + encodeURIComponent(id as string),
          isActive: true,
        },
      ];
      dispatch(updateBreadCrumbPath(currentPath));
    }
  }, [id]);

  // Redirect to the settings page if the section is not defined
  React.useEffect(() => {
    if (!section) {
      navigate("/services/" + serviceId);
    }
  }, [section]);

  if (serviceSettingsData.isLoading || !serviceSettingsData.service) {
    return <DataSpinner />;
  }

  const service = partialServiceToService(serviceSettingsData.service);

  return (
    <Page>
      <alerts.ManagedAlerts />
      <PageSection variant={PageSectionVariants.light} className="pf-v5-u-pr-0">
        <BreadCrumb className="pf-v5-u-mb-md" />
        <TitleLayout
          id={service.krbcanonicalname}
          text={service.krbcanonicalname}
          headingLevel="h1"
        />
      </PageSection>
      <PageSection type="tabs" variant={PageSectionVariants.light} isFilled>
        <Tabs
          activeKey={activeTabKey}
          onSelect={handleTabClick}
          variant="light300"
          isBox
          className="pf-v5-u-ml-lg"
          mountOnEnter
          unmountOnExit
        >
          <Tab
            eventKey={"settings"}
            name="details"
            title={<TabTitleText>Settings</TabTitleText>}
          >
            <PageSection className="pf-v5-u-pb-0"></PageSection>
            <ServicesSettings
              service={service}
              onRefresh={serviceSettingsData.refetch}
            />
          </Tab>
          <Tab
            eventKey={"memberof"}
            name="details"
            title={<TabTitleText>Is a member of</TabTitleText>}
          >
            <PageSection className="pf-v5-u-pb-0"></PageSection>
            <ServicesMemberOf service={service} />
          </Tab>
          <Tab
            eventKey={"managedby"}
            name="details"
            title={<TabTitleText>Is managed by</TabTitleText>}
          >
            <PageSection className="pf-v5-u-pb-0"></PageSection>
            <ServicesManagedBy service={service} />
          </Tab>
        </Tabs>
      </PageSection>
    </Page>
  );
};

export default ServicesTabs;
