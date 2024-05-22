import React from "react";
// PatternFly
import { Pagination, PaginationVariant } from "@patternfly/react-core";
// Data types
import { User, SudoRule } from "src/utils/datatypes/globalDataTypes";
// Components
import MemberOfToolbar, { MembershipDirection } from "./MemberOfToolbar";
import MemberOfTableSudoRules from "./MemberOfTableSudoRules";
import MemberOfAddModal, { AvailableItems } from "./MemberOfAddModal";
import MemberOfDeleteModal from "./MemberOfDeleteModal";
// Hooks
import useAlerts from "src/hooks/useAlerts";
// RPC
import {
  useGetSudoRulesInfoByNameQuery,
  useAddToSudoRulesMutation,
  useGettingSudoRulesQuery,
  useRemoveFromSudoRulesMutation,
} from "src/services/rpcSudoRules";
// Utils
import { API_VERSION_BACKUP, paginate } from "src/utils/utils";
import { apiToSudoRule } from "src/utils/sudoRulesUtils";
import { ErrorResult } from "src/services/rpc";

interface MemberOfSudoRulesProps {
  user: Partial<User>;
  from: string;
  isUserDataLoading: boolean;
  onRefreshUserData: () => void;
}

const MemberOfSudoRules = (props: MemberOfSudoRulesProps) => {
  // Alerts to show in the UI
  const alerts = useAlerts();

  // Page indexes
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);

  // Other states
  const [sudoRulesSelected, setSudoRulesSelected] = React.useState<string[]>(
    []
  );
  const [searchValue, setSearchValue] = React.useState("");

  // Loaded Sudo rules based on paging and member attributes
  const [sudoRules, setSudoRules] = React.useState<SudoRule[]>([]);

  // Membership direction and Sudo rules
  const [membershipDirection, setMembershipDirection] =
    React.useState<MembershipDirection>("direct");

  const memberof_sudorule = props.user.memberof_sudorule || [];
  const memberofindirect_sudorule = props.user.memberofindirect_sudorule || [];
  let sudoRuleNames =
    membershipDirection === "direct"
      ? memberof_sudorule
      : memberofindirect_sudorule;
  sudoRuleNames = [...sudoRuleNames];

  const getSudoRulesNameToLoad = (): string[] => {
    let toLoad = [...sudoRuleNames];
    toLoad.sort();

    // Filter by search
    if (searchValue) {
      toLoad = toLoad.filter((name) =>
        name.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    // Apply paging
    toLoad = paginate(toLoad, page, perPage);
    return toLoad;
  };

  const [sudoRulesNamesToLoad, setSudoRulesNamesToLoad] = React.useState<
    string[]
  >(getSudoRulesNameToLoad());

  // Load Sudo rules
  const fullSudoRulesQuery = useGetSudoRulesInfoByNameQuery({
    sudoRuleNamesList: sudoRulesNamesToLoad,
    no_members: true,
    version: API_VERSION_BACKUP,
  });

  // Reset page on direction change
  React.useEffect(() => {
    setPage(1);
  }, [membershipDirection]);

  // Refresh Sudo rules
  React.useEffect(() => {
    const sudoRulesNames = getSudoRulesNameToLoad();
    setSudoRulesNamesToLoad(sudoRulesNames);
  }, [props.user, membershipDirection, searchValue, page, perPage]);

  React.useEffect(() => {
    if (sudoRulesNamesToLoad.length > 0) {
      fullSudoRulesQuery.refetch();
    }
  }, [sudoRulesNamesToLoad]);

  // Update Sudo rules
  React.useEffect(() => {
    if (fullSudoRulesQuery.data && !fullSudoRulesQuery.isFetching) {
      setSudoRules(fullSudoRulesQuery.data);
    }
  }, [fullSudoRulesQuery.data, fullSudoRulesQuery.isFetching]);

  // Computed "states"
  const someItemSelected = sudoRulesSelected.length > 0;
  const showTableRows = sudoRules.length > 0;

  // Dialogs and actions
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  // Buttons functionality
  // - Refresh
  const isRefreshButtonEnabled =
    !fullSudoRulesQuery.isFetching && !props.isUserDataLoading;
  const isAddButtonEnabled =
    membershipDirection !== "indirect" && isRefreshButtonEnabled;

  // Add new member to 'Sudo rules'
  // API calls
  const [addMemberToSudoRules] = useAddToSudoRulesMutation();
  const [removeMembersFromSudoRules] = useRemoveFromSudoRulesMutation();
  const [adderSearchValue, setAdderSearchValue] = React.useState("");
  const [availableSudoRules, setAvailableSudoRules] = React.useState<
    SudoRule[]
  >([]);
  const [availableItems, setAvailableItems] = React.useState<AvailableItems[]>(
    []
  );

  // Load available Sudo rules, delay the search for opening the modal
  const sudoRulesQuery = useGettingSudoRulesQuery({
    search: adderSearchValue,
    apiVersion: API_VERSION_BACKUP,
    sizelimit: 100,
    startIdx: 0,
    stopIdx: 100,
  });

  // Trigger available Sudo rules search
  React.useEffect(() => {
    if (showAddModal) {
      sudoRulesQuery.refetch();
    }
  }, [showAddModal, adderSearchValue, props.user]);

  // Update available Sudo rules
  React.useEffect(() => {
    if (sudoRulesQuery.data && !sudoRulesQuery.isFetching) {
      // transform data to Sudo rules
      const count = sudoRulesQuery.data.result.count;
      const results = sudoRulesQuery.data.result.results;
      let items: AvailableItems[] = [];
      const avalSudoRules: SudoRule[] = [];
      for (let i = 0; i < count; i++) {
        const sudoRule = apiToSudoRule(results[i].result);
        avalSudoRules.push(sudoRule);
        items.push({
          key: sudoRule.cn,
          title: sudoRule.cn,
        });
      }
      items = items.filter((item) => !sudoRulesNamesToLoad.includes(item.key));

      setAvailableSudoRules(avalSudoRules);
      setAvailableItems(items);
    }
  }, [sudoRulesQuery.data, sudoRulesQuery.isFetching]);

  // - Add
  const onAddSudoRule = (items: AvailableItems[]) => {
    const uid = props.user.uid;
    const newSudoRuleNames = items.map((item) => item.key);
    if (uid === undefined || newSudoRuleNames.length == 0) {
      return;
    }

    addMemberToSudoRules([uid, "user", newSudoRuleNames]).then((response) => {
      if ("data" in response) {
        if (response.data.result) {
          // Set alert: success
          alerts.addAlert(
            "add-member-success",
            `Assigned new Sudo rule to user ${uid}`,
            "success"
          );
          // Update displayed Sudo Rules before they are updated via refresh
          const newSudoRules = sudoRules.concat(
            availableSudoRules.filter((sudoRule) =>
              newSudoRuleNames.includes(sudoRule.cn)
            )
          );
          setSudoRules(newSudoRules);

          // Refresh data
          props.onRefreshUserData();
          // Close modal
          setShowAddModal(false);
        } else if (response.data.error) {
          // Set alert: error
          const errorMessage = response.data.error as unknown as ErrorResult;
          alerts.addAlert("add-member-error", errorMessage.message, "danger");
        }
      }
    });
  };

  // - Delete
  const onDeleteSudoRules = () => {
    if (props.user.uid) {
      removeMembersFromSudoRules([
        props.user.uid,
        "user",
        sudoRulesSelected,
      ]).then((response) => {
        if ("data" in response) {
          if (response.data.result) {
            // Set alert: success
            alerts.addAlert(
              "remove-sudo-rules-success",
              "Removed Sudo rules from user '" + props.user.uid + "'",
              "success"
            );
            // Update displayed HBAC rules
            const newSudoRules = sudoRules.filter(
              (sudoRule) => !sudoRulesSelected.includes(sudoRule.cn)
            );
            setSudoRules(newSudoRules);
            // Update data
            setSudoRulesSelected([]);
            // Close modal
            setShowDeleteModal(false);
            // Refresh
            props.onRefreshUserData();
          } else if (response.data.error) {
            // Set alert: error
            const errorMessage = response.data.error as unknown as ErrorResult;
            alerts.addAlert(
              "remove-sudo-rules-error",
              errorMessage.message,
              "danger"
            );
          }
        }
      });
    }
  };

  return (
    <>
      <alerts.ManagedAlerts />
      <MemberOfToolbar
        searchText={searchValue}
        onSearchTextChange={setSearchValue}
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onSearch={() => {}}
        refreshButtonEnabled={isRefreshButtonEnabled}
        onRefreshButtonClick={props.onRefreshUserData}
        deleteButtonEnabled={someItemSelected}
        onDeleteButtonClick={() => setShowDeleteModal(true)}
        addButtonEnabled={isAddButtonEnabled}
        onAddButtonClick={() => setShowAddModal(true)}
        membershipDirectionEnabled={true}
        membershipDirection={membershipDirection}
        onMembershipDirectionChange={setMembershipDirection}
        helpIconEnabled={true}
        totalItems={sudoRuleNames.length}
        perPage={perPage}
        page={page}
        onPerPageChange={setPerPage}
        onPageChange={setPage}
      />
      <MemberOfTableSudoRules
        sudoRules={sudoRules}
        checkedItems={sudoRulesSelected}
        onCheckItemsChange={setSudoRulesSelected}
        showTableRows={showTableRows}
      />
      <Pagination
        className="pf-v5-u-pb-0 pf-v5-u-pr-md"
        itemCount={sudoRuleNames.length}
        widgetId="pagination-options-menu-bottom"
        perPage={perPage}
        page={page}
        variant={PaginationVariant.bottom}
        onSetPage={(_e, page) => setPage(page)}
        onPerPageSelect={(_e, perPage) => setPerPage(perPage)}
      />
      {showAddModal && (
        <MemberOfAddModal
          showModal={showAddModal}
          onCloseModal={() => setShowAddModal(false)}
          availableItems={availableItems}
          onAdd={onAddSudoRule}
          onSearchTextChange={setAdderSearchValue}
          title={`Assign Sudo rule to user ${props.user.uid}`}
          ariaLabel="Add user of Sudo rule modal"
        />
      )}
      {showDeleteModal && someItemSelected && (
        <MemberOfDeleteModal
          showModal={showDeleteModal}
          onCloseModal={() => setShowDeleteModal(false)}
          title="Delete user from Sudo rules"
          onDelete={onDeleteSudoRules}
        >
          <MemberOfTableSudoRules
            sudoRules={sudoRules.filter((sudorule) =>
              sudoRulesSelected.includes(sudorule.cn)
            )}
            showTableRows
          />
        </MemberOfDeleteModal>
      )}
    </>
  );
};

export default MemberOfSudoRules;