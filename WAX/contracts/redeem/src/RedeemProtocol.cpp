#include <redeemprotocol.hpp>

ACTION redeemprotocol::init() {
    require_auth(get_self());
    config.get_or_create(get_self(), config_s{});
}

ACTION redeemprotocol::redeem(
    name owner,
    vector <uint64_t> asset_ids,
    redeem_method method)
{
    require_auth(owner);

    assets_t owner_assets = get_asset(owner);
    auto r = get_redemption();
    for (uint64_t asset_id : asset_ids) {
        auto asset_itr = owner_assets.require_find(asset_id,
            ("Not asset owner (ID: " + to_string(asset_id) + ")").c_str());
        auto itr = r.find(asset_id);
        check(itr == r.end(),
            ("This asset has been redeemed: (ID: " + to_string(asset_id) + ")").c_str());
        r.emplace( owner, [&]( auto& row ) {
            row.asset_id = asset_id;
            row.method = method;
            row.requester = owner;
        });
    }
}

ACTION redeemprotocol::settr(name new_token_receiver) {
    require_auth(get_self());
    config_s current_config = config.get();
    current_config.token_receiver = new_token_receiver;
    config.set(current_config, get_self());
}

ACTION redeemprotocol::refund(vector <uint64_t> asset_ids) {
    config_s current_config = config.get();
    require_auth(current_config.token_receiver);

    auto r = get_redemption();
    for (uint64_t asset_id : asset_ids) {
        auto itr = r.find(asset_id);
        check(itr != r.end(),
            ("Redemption not found: (ID: " + to_string(asset_id) + ")").c_str());
        if (itr->method == e_redeem_method::transfer) {
            vector<uint64_t> ids{asset_id};
            action(
                permission_level{current_config.token_receiver, name("active")},
                name("atomicassets"),
                name("transfer"),
                make_tuple(
                    current_config.token_receiver,
                    itr->requester,
                    ids,
                    string("RE:DREAMER refund"))
            ).send();
        }

        r.erase(itr);
    }
}

redeemprotocol::redemption_t redeemprotocol::get_redemption() {
    return redemption_t(get_self(), get_self().value);
}

redeemprotocol::assets_t redeemprotocol::get_asset(name owner) {
    return assets_t("atomicassets"_n, owner.value);
}